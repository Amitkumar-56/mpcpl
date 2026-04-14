// src/app/api/attendance/bulk-mark/route.js
// Bulk attendance marking API
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

// POST - Bulk mark attendance
export async function POST(request) {
  try {
    const body = await request.json();
    const { attendance_data, date, station_id } = body;

    // Validation
    if (!attendance_data || !Array.isArray(attendance_data) || attendance_data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Attendance data is required and must be an array' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const currentUserId = decoded.userId || decoded.id;

    // Get current user's role and station assignment
    const userInfo = await executeQuery(
      `SELECT role, fs_id FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    if (!userInfo || userInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = parseInt(userInfo[0].role) || 0;
    const userFsId = userInfo[0].fs_id || '';

    // Staff (role 1) cannot mark attendance
    if (userRole === 1) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Staff cannot mark attendance.' },
        { status: 403 }
      );
    }

    // Validate station access for non-admin users
    if (userRole !== 5 && station_id) {
      const stationIds = userFsId.toString().split(',').map(id => id.trim());
      if (!stationIds.includes(station_id.toString())) {
        return NextResponse.json(
          { success: false, error: 'Access denied. You can only mark attendance for your assigned stations.' },
          { status: 403 }
        );
      }
    }

    // Get current user name for audit log
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      const userId = currentUser?.userId || currentUser?.id || currentUserId;
      const empResult = await executeQuery(
        `SELECT name FROM employee_profile WHERE id = ?`,
        [userId]
      );
      if (empResult.length > 0 && empResult[0].name) {
        userName = empResult[0].name;
      }
    } catch (authError) {
      console.warn('Auth check failed:', authError.message);
    }

    const results = [];
    const errors = [];

    // Process each attendance record
    for (const attendance of attendance_data) {
      try {
        const { employee_id, status, check_in_time, check_out_time, remarks } = attendance;

        if (!employee_id) {
          errors.push({ employee_id, error: 'Employee ID is required' });
          continue;
        }

        // Validate employee access based on user role
        if (userRole !== 5) {
          const employeeCheck = await executeQuery(
            `SELECT role, fs_id FROM employee_profile WHERE id = ?`,
            [employee_id]
          );

          if (!employeeCheck || employeeCheck.length === 0) {
            errors.push({ employee_id, error: 'Employee not found' });
            continue;
          }

          const empRole = parseInt(employeeCheck[0].role) || 0;
          const empFsId = employeeCheck[0].fs_id || '';

          // For incharge: only staff (role 1)
          if (userRole === 2 && empRole !== 1) {
            errors.push({ employee_id, error: 'You can only mark attendance for staff members.' });
            continue;
          }

          // Check if employee belongs to the station
          if (station_id) {
            const empStationIds = empFsId.toString().split(',').map(id => id.trim());
            if (!empStationIds.includes(station_id.toString())) {
              errors.push({ employee_id, error: 'Employee does not belong to this station.' });
              continue;
            }
          }
        }

        // Check if attendance already exists
        const existing = await executeQuery(
          `SELECT id FROM attendance 
           WHERE employee_id = ? AND attendance_date = ?`,
          [employee_id, date]
        );

        // Get employee info for audit log
        const employeeInfo = await executeQuery(
          `SELECT name, emp_code FROM employee_profile WHERE id = ?`,
          [employee_id]
        );
        const employeeName = employeeInfo.length > 0 ? employeeInfo[0].name : `Employee ID: ${employee_id}`;

        if (existing && existing.length > 0) {
          // Update existing record
          const updateQuery = `
            UPDATE attendance 
            SET check_in_time = ?, 
                check_out_time = ?, 
                status = ?, 
                remarks = ?, 
                marked_by = ?, 
                updated_at = NOW()
            WHERE id = ?
          `;
          
          await executeQuery(updateQuery, [
            check_in_time || null,
            check_out_time || null,
            status || 'Present',
            remarks || null,
            currentUserId,
            existing[0].id
          ]);

          results.push({
            employee_id,
            action: 'updated',
            attendance_id: existing[0].id,
            employee_name: employeeName
          });

          // Create audit log for update
          try {
            await createAuditLog({
              page: 'Attendance',
              uniqueCode: `ATTENDANCE-BULK-${existing[0].id}`,
              section: 'Bulk Attendance Update',
              userId: currentUserId,
              userName: userName || (currentUserId ? `Employee ID: ${currentUserId}` : null),
              action: 'edit',
              remarks: `Bulk attendance updated for ${employeeName} on ${date}. Status: ${status || 'Present'}`,
              oldValue: null,
              newValue: { employee_id, date, status, check_in_time, check_out_time, remarks },
              recordType: 'attendance',
              recordId: existing[0].id
            });
          } catch (auditError) {
            console.error('Audit log creation failed (non-critical):', auditError);
          }

        } else {
          // Insert new record - get station from employee if not provided
          let finalStationId = station_id;
          if (!finalStationId) {
            const empStationInfo = await executeQuery(
              `SELECT fs_id FROM employee_profile WHERE id = ?`,
              [employee_id]
            );
            if (empStationInfo.length > 0 && empStationInfo[0].fs_id) {
              // Get first station from employee's station list
              const empStations = empStationInfo[0].fs_id.toString().split(',').map(id => id.trim());
              finalStationId = empStations[0];
            }
          }

          if (!finalStationId) {
            errors.push({ employee_id, error: 'Station could not be determined for employee' });
            continue;
          }

          const insertQuery = `
            INSERT INTO attendance 
            (employee_id, station_id, attendance_date, check_in_time, check_out_time, status, remarks, marked_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;

          const result = await executeQuery(insertQuery, [
            employee_id,
            finalStationId,
            date,
            check_in_time || null,
            check_out_time || null,
            status || 'Present',
            remarks || null,
            currentUserId
          ]);

          results.push({
            employee_id,
            action: 'created',
            attendance_id: result.insertId,
            employee_name: employeeName
          });

          // Create audit log for creation
          try {
            await createAuditLog({
              page: 'Attendance',
              uniqueCode: `ATTENDANCE-BULK-${result.insertId}`,
              section: 'Bulk Attendance Create',
              userId: currentUserId,
              userName: userName || (currentUserId ? `Employee ID: ${currentUserId}` : null),
              action: 'add',
              remarks: `Bulk attendance marked for ${employeeName} on ${date}. Status: ${status || 'Present'}`,
              oldValue: null,
              newValue: { employee_id, date, status, check_in_time, check_out_time, remarks },
              recordType: 'attendance',
              recordId: result.insertId
            });
          } catch (auditError) {
            console.error('Audit log creation failed (non-critical):', auditError);
          }
        }

      } catch (error) {
        console.error(`Error processing attendance for employee ${attendance.employee_id}:`, error);
        errors.push({
          employee_id: attendance.employee_id,
          error: error.message
        });
      }
    }

    // Update attendance_summary table for all affected employees
    try {
      const [year, month] = date.split('-');
      const uniqueEmployeeIds = [...new Set(attendance_data.map(a => a.employee_id))];
      
      for (const employeeId of uniqueEmployeeIds) {
        // Calculate attendance summary for this employee
        const attendanceStats = await executeQuery(
          `SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) as leave_days,
            SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as half_days,
            SUM(CASE WHEN status IN ('Present', 'Half Day') THEN 1 ELSE 0 END) as worked_days
          FROM attendance 
          WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?`,
          [employeeId, parseInt(month), parseInt(year)]
        );

        const stats = attendanceStats[0] || {
          total_days: 0,
          present_days: 0,
          absent_days: 0,
          leave_days: 0,
          half_days: 0,
          worked_days: 0
        };

        // Calculate working days (excluding Sundays) for the month
        const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
        const lastDay = new Date(parseInt(year), parseInt(month), 0);
        const workingDays = Array.from({length: lastDay.getDate()}, (_, i) => i + 1)
          .filter(day => new Date(parseInt(year), parseInt(month) - 1, day).getDay() !== 0) // Exclude Sundays
          .length;

        stats.total_days = workingDays;

        // Check if summary record exists
        const existingSummary = await executeQuery(
          `SELECT id FROM attendance_summary WHERE employee_id = ? AND month = ? AND year = ?`,
          [employeeId, parseInt(month), parseInt(year)]
        );

        if (existingSummary && existingSummary.length > 0) {
          // Update existing summary
          await executeQuery(
            `UPDATE attendance_summary 
            SET total_days = ?, present_days = ?, absent_days = ?, leave_days = ?, 
                half_days = ?, worked_days = ?, updated_at = NOW()
            WHERE employee_id = ? AND month = ? AND year = ?`,
            [
              stats.total_days,
              stats.present_days,
              stats.absent_days,
              stats.leave_days,
              stats.half_days,
              stats.worked_days,
              employeeId,
              parseInt(month),
              parseInt(year)
            ]
          );
        } else {
          // Insert new summary
          await executeQuery(
            `INSERT INTO attendance_summary 
            (employee_id, month, year, total_days, present_days, absent_days, leave_days, half_days, worked_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              employeeId,
              parseInt(month),
              parseInt(year),
              stats.total_days,
              stats.present_days,
              stats.absent_days,
              stats.leave_days,
              stats.half_days,
              stats.worked_days
            ]
          );
        }
      }
    } catch (summaryError) {
      console.error('Error updating attendance summary:', summaryError);
      // Don't fail the main operation, just log the error
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${attendance_data.length} attendance records. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors,
      summary: {
        total: attendance_data.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Error in bulk attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
