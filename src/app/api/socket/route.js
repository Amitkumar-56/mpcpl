// src/app/api/socket/route.js
import { executeQuery } from "@/lib/db";
import { Server } from "socket.io";

let io;

export default function SocketHandler(req, res) {
  if (!res.socket.server.io) {
    console.log("✅ Setting up Socket.IO server on port 3000");

    io = new Server(res.socket.server, {
      path: "/api/socket/",
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("✅ User connected:", socket.id);

      // 🔥 CUSTOMER JOIN
      socket.on("customer_join", async (data) => {
        try {
          const { customerId, customerName } = data;
          
          if (!customerId) {
            socket.emit("error", { message: "Customer ID is required" });
            return;
          }

          socket.join(`customer_${customerId}`);
          socket.customerId = customerId;
          socket.userType = 'customer';
          socket.userName = customerName;
          
          console.log(`👤 Customer ${customerId} (${customerName}) joined room`);

          // Join employees room to listen for broadcasts
          socket.join("employees");

          // Notify employees that customer is online
          socket.to("employees").emit("customer_online", {
            customerId,
            customerName,
            socketId: socket.id
          });

          socket.emit("joined_success", { 
            message: "Successfully joined chat", 
            customerId 
          });

        } catch (error) {
          console.error("❌ Error in customer_join:", error);
          socket.emit("error", { message: "Failed to join chat" });
        }
      });

      // 🔥 CUSTOMER MESSAGE
      socket.on("customer_message", async (data) => {
        try {
          const { customerId, text, customerName } = data;
          console.log('📨 Customer message event:', data);

          if (!customerId || !text) {
            socket.emit("error", { message: "Customer ID and text are required" });
            return;
          }

          // Save to database
          const result = await executeQuery(
            `INSERT INTO messages (text, sender, customer_id, status, timestamp) 
             VALUES (?, 'customer', ?, 'sent', NOW())`,
            [text, customerId]
          );

          // Update chat session
          await executeQuery(
            `INSERT INTO chat_sessions (customer_id, last_message_at, status) 
             VALUES (?, NOW(), 'active') 
             ON DUPLICATE KEY UPDATE last_message_at = NOW(), status = 'active'`,
            [customerId]
          );

          // Get saved message
          const [savedMessage] = await executeQuery(
            `SELECT m.*, c.name as customer_name 
             FROM messages m 
             LEFT JOIN customers c ON m.customer_id = c.id 
             WHERE m.id = ?`,
            [result.insertId]
          );

          console.log('💾 Message saved to database:', savedMessage);

          // Format message for frontend
          const messageData = {
            id: savedMessage.id,
            text: savedMessage.text,
            sender: savedMessage.sender,
            customer_id: savedMessage.customer_id,
            status: savedMessage.status,
            timestamp: savedMessage.timestamp
          };

          // 🔥 BROADCAST TO ALL EMPLOYEES
          io.to("employees").emit("new_message", {
            message: messageData,
            customerId,
            customerName: savedMessage.customer_name || customerName
          });

          // Confirm delivery to customer
          socket.emit("message_sent", { 
            messageId: savedMessage.id,
            status: 'sent'
          });

          console.log('📢 Message broadcasted to all employees');

        } catch (error) {
          console.error("❌ Error handling customer message:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // 🔥 EMPLOYEE JOIN
      socket.on("employee_join", (employeeId) => {
        try {
          if (!employeeId) {
            socket.emit("error", { message: "Employee ID is required" });
            return;
          }

          socket.join("employees");
          socket.employeeId = employeeId;
          socket.userType = 'employee';
          
          console.log(`👨‍💼 Employee ${employeeId} joined employees room`);

          socket.emit("employee_joined", { 
            message: "Employee joined successfully" 
          });

        } catch (error) {
          console.error("❌ Error in employee_join:", error);
          socket.emit("error", { message: "Failed to join as employee" });
        }
      });

      // 🔥 EMPLOYEE MESSAGE
      socket.on("employee_message", async (data) => {
        try {
          const { customerId, text, employeeId, employeeName } = data;
          console.log('📨 Employee message event:', data);

          if (!customerId || !text || !employeeId) {
            socket.emit("error", { message: "Customer ID, text and employee ID are required" });
            return;
          }

          // Save to database
          const result = await executeQuery(
            `INSERT INTO messages (text, sender, customer_id, employee_id, status, timestamp) 
             VALUES (?, 'employee', ?, ?, 'delivered', NOW())`,
            [text, customerId, employeeId]
          );

          // Update chat session
          await executeQuery(
            `UPDATE chat_sessions SET employee_id = ?, last_message_at = NOW(), status = 'active' 
             WHERE customer_id = ?`,
            [employeeId, customerId]
          );

          // Get saved message
          const [savedMessage] = await executeQuery(
            `SELECT m.*, ep.name as employee_name 
             FROM messages m 
             LEFT JOIN employee_profile ep ON m.employee_id = ep.id 
             WHERE m.id = ?`,
            [result.insertId]
          );

          // Format message for frontend
          const messageData = {
            id: savedMessage.id,
            text: savedMessage.text,
            sender: savedMessage.sender,
            customer_id: savedMessage.customer_id,
            employee_id: savedMessage.employee_id,
            status: savedMessage.status,
            timestamp: savedMessage.timestamp,
            employee_name: savedMessage.employee_name || employeeName
          };

          // Send to customer
          io.to(`customer_${customerId}`).emit("new_message", {
            message: messageData,
            employeeName: savedMessage.employee_name || employeeName
          });

          // Confirm to employee
          socket.emit("message_sent", {
            messageId: savedMessage.id,
            status: 'delivered'
          });

          console.log('📤 Employee message sent to customer:', customerId);

        } catch (error) {
          console.error("❌ Error handling employee message:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      });

      // 🔥 TYPING INDICATORS
      socket.on("typing_start", (data) => {
        const { customerId, userType, userName } = data;
        
        if (userType === 'customer') {
          // Customer is typing - notify employees
          socket.to("employees").emit("customer_typing", {
            customerId,
            customerName: userName,
            typing: true
          });
        } else if (userType === 'employee') {
          // Employee is typing - notify customer
          socket.to(`customer_${customerId}`).emit("employee_typing", {
            employeeName: userName,
            typing: true
          });
        }
      });

      socket.on("typing_stop", (data) => {
        const { customerId, userType } = data;
        
        if (userType === 'customer') {
          // Customer stopped typing
          socket.to("employees").emit("customer_typing", {
            customerId,
            typing: false
          });
        } else if (userType === 'employee') {
          // Employee stopped typing
          socket.to(`customer_${customerId}`).emit("employee_typing", {
            typing: false
          });
        }
      });

      // 🔥 MARK AS READ
      socket.on("mark_as_read", async (data) => {
        try {
          const { customerId, userId, userType } = data;
          console.log('👀 Marking messages as read:', data);

          if (!customerId) {
            socket.emit("error", { message: "Customer ID is required" });
            return;
          }

          const senderToUpdate = userType === 'employee' ? 'customer' : 'employee';

          await executeQuery(
            `UPDATE messages SET status = 'read' 
             WHERE customer_id = ? 
             AND sender = ? 
             AND status != 'read'`,
            [customerId, senderToUpdate]
          );

          // Notify the other party
          if (userType === 'employee') {
            io.to(`customer_${customerId}`).emit("message_read", { 
              customerId
            });
          } else {
            io.to("employees").emit("customer_read_messages", { 
              customerId
            });
          }

          console.log(`✅ Messages marked as read by ${userType}`);

        } catch (error) {
          console.error("❌ Error marking messages as read:", error);
          socket.emit("error", { message: "Failed to mark messages as read" });
        }
      });

      // Join specific customer room (for employees)
      socket.on("employee_join_customer", (customerId) => {
        if (customerId) {
          socket.join(`customer_${customerId}`);
          console.log(`👨‍💼 Employee joined customer room: customer_${customerId}`);
        }
      });

      // Handle disconnect
      socket.on("disconnect", (reason) => {
        console.log("❌ User disconnected:", socket.id, "Reason:", reason);
        
        if (socket.userType === 'customer' && socket.customerId) {
          // Notify employees that customer went offline
          socket.to("employees").emit("customer_offline", {
            customerId: socket.customerId,
            customerName: socket.userName
          });
        }
      });

      // Error handling
      socket.on("error", (error) => {
        console.error("🔴 Socket error:", error);
      });

    });

    res.socket.server.io = io;
  } else {
    console.log("✅ Socket.IO server already running");
    io = res.socket.server.io;
  }
  
  res.end();
}