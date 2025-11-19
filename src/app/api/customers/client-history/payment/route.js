// app/api/customers/client-history/payment/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { customerId, rechargeAmount, paymentType } = body;

    console.log('Payment request:', { customerId, rechargeAmount, paymentType });

    if (!customerId || !rechargeAmount) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Customer ID and amount are required' 
        },
        { status: 400 }
      );
    }

    await executeQuery('START TRANSACTION');

    try {
      // Get customer info
      const customerInfo = await executeQuery(
        `SELECT day_limit, amtlimit, balance, day_amount 
         FROM customer_balances WHERE com_id = ?`,
        [customerId]
      );

      if (customerInfo.length === 0) {
        throw new Error('Customer balance not found');
      }

      const customer = customerInfo[0];
      const isDayLimitCustomer = customer.day_limit > 0;
      const amount = parseFloat(rechargeAmount);

      if (paymentType === 'one_day') {
        // One day payment logic for day limit customers
        if (!isDayLimitCustomer) {
          throw new Error('One day payment only available for day limit customers');
        }

        // Update day_amount to extend service by one day
        await executeQuery(
          'UPDATE customer_balances SET day_amount = GREATEST(0, day_amount - 1) WHERE com_id = ?',
          [customerId]
        );

        // Record the payment in filling_history
        await executeQuery(
          `INSERT INTO filling_history (
            cl_id, trans_type, amount, credit, new_amount, 
            remaining_limit, created_by, created_at
          ) VALUES (?, 'inward', ?, ?, ?, ?, ?, NOW())`,
          [
            customerId,
            amount,
            amount,
            customer.balance - amount,
            customer.day_limit,
            1
          ]
        );

        // Update customer balance
        await executeQuery(
          'UPDATE customer_balances SET balance = balance - ? WHERE com_id = ?',
          [amount, customerId]
        );

        await executeQuery('COMMIT');

        return NextResponse.json({
          success: true,
          message: `One day payment of ₹${amount} processed successfully. Service extended.`,
          amountPaid: amount
        });

      } else {
        // Regular payment processing
        let remainingAmount = amount;
        let invoicesPaid = 0;
        let totalPaidAmount = 0;

        // Get pending transactions
        const pendingTransactions = await executeQuery(
          `SELECT id, totalamt as amount, completed_date
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
           ORDER BY completed_date ASC`,
          [customerId]
        );

        // Pay off oldest invoices first
        for (const transaction of pendingTransactions) {
          if (remainingAmount <= 0) break;

          const transactionAmount = parseFloat(transaction.amount);
          
          if (remainingAmount >= transactionAmount) {
            await executeQuery(
              'UPDATE filling_requests SET payment_status = 1, payment_date = NOW() WHERE id = ?',
              [transaction.id]
            );
            remainingAmount -= transactionAmount;
            totalPaidAmount += transactionAmount;
            invoicesPaid++;
          } else {
            break;
          }
        }

        // Update customer balance
        const newBalance = customer.balance - amount;
        await executeQuery(
          'UPDATE customer_balances SET balance = ? WHERE com_id = ?',
          [newBalance, customerId]
        );

        // For day limit customers, reset day counter if all paid
        if (isDayLimitCustomer && invoicesPaid > 0) {
          await executeQuery(
            'UPDATE customer_balances SET day_amount = 0 WHERE com_id = ?',
            [customerId]
          );
        }

        // Record in filling_history
        if (amount > 0) {
          await executeQuery(
            `INSERT INTO filling_history (
              cl_id, trans_type, amount, credit, new_amount, 
              remaining_limit, created_by, created_at
            ) VALUES (?, 'inward', ?, ?, ?, ?, ?, NOW())`,
            [
              customerId,
              amount,
              amount,
              newBalance,
              isDayLimitCustomer ? customer.day_limit : customer.amtlimit,
              1
            ]
          );
        }

        await executeQuery('COMMIT');

        return NextResponse.json({
          success: true,
          message: `Payment processed successfully. ${invoicesPaid} invoice(s) paid. Amount: ₹${totalPaidAmount}.`,
          invoicesPaid,
          amountPaid: totalPaidAmount,
          remainingBalance: remainingAmount
        });
      }

    } catch (error) {
      await executeQuery('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process payment' 
      },
      { status: 500 }
    );
  }
}