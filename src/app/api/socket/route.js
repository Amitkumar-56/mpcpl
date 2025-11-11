// src/app/api/socket/route.js
import { executeQuery } from "@/lib/db";

// Global WebSocket server instance
let io;

export default function SocketHandler(req, res) {
  // If response is already sent, return
  if (res.headersSent) {
    return res.end();
  }

  // Initialize Socket.IO only once
  if (!res.socket.server.io) {
    console.log("✅ Initializing Socket.IO server...");

    try {
      const { Server } = require("socket.io");
      
      io = new Server(res.socket.server, {
        path: "/api/socket/",
        cors: {
          origin: process.env.NODE_ENV === "production" 
            ? ["https://yourdomain.com"] 
            : ["http://localhost:3000", "http://127.0.0.1:3000"],
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling']
      });

      io.on("connection", (socket) => {
        console.log("✅ User connected:", socket.id);

        // CUSTOMER JOIN
        socket.on("customer_join", async (data) => {
          try {
            const { customerId, customerName } = data;
            
            if (!customerId) {
              socket.emit("error", { message: "Customer ID is required" });
              return;
            }

            console.log(`👤 Customer ${customerId} joining...`);
            
            // Join customer room
            await socket.join(`customer_${customerId}`);
            
            socket.customerId = customerId;
            socket.userType = 'customer';
            socket.userName = customerName;

            console.log(`✅ Customer ${customerId} joined successfully`);

            // Send success message
            socket.emit("joined_success", { 
              message: "Successfully joined chat", 
              customerId,
              socketId: socket.id
            });

          } catch (error) {
            console.error("❌ Error in customer_join:", error);
            socket.emit("error", { message: "Failed to join chat" });
          }
        });

        // CUSTOMER MESSAGE
        socket.on("customer_message", async (data) => {
          try {
            const { customerId, text, customerName, tempId } = data;
            console.log('📨 Customer message event:', { customerId, text: text?.substring(0, 50) });

            if (!customerId || !text) {
              socket.emit("error", { message: "Customer ID and text are required" });
              return;
            }

            // Save message to database
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

            // Get saved message with customer name
            const [savedMessage] = await executeQuery(
              `SELECT m.*, c.name as customer_name 
               FROM messages m 
               LEFT JOIN customers c ON m.customer_id = c.id 
               WHERE m.id = ?`,
              [result.insertId]
            );

            const messageData = {
              id: savedMessage.id,
              text: savedMessage.text,
              sender: savedMessage.sender,
              customer_id: savedMessage.customer_id,
              status: savedMessage.status,
              timestamp: savedMessage.timestamp
            };

            // Broadcast to all connected clients in customer room
            io.to(`customer_${customerId}`).emit("new_message", {
              message: messageData
            });

            // Send confirmation to sender
            socket.emit("message_sent", { 
              messageId: savedMessage.id,
              tempId: tempId,
              status: 'sent'
            });

            console.log('✅ Message processed successfully');

          } catch (error) {
            console.error("❌ Error handling customer message:", error);
            socket.emit("error", { message: "Failed to send message" });
          }
        });

        // EMPLOYEE JOIN
        socket.on("employee_join", (data) => {
          try {
            const { employeeId, employeeName } = data;
            
            if (!employeeId) {
              socket.emit("error", { message: "Employee ID is required" });
              return;
            }

            socket.join("employees");
            socket.employeeId = employeeId;
            socket.userType = 'employee';
            socket.userName = employeeName;
            
            console.log(`👨‍💼 Employee ${employeeId} joined employees room`);

            socket.emit("employee_joined", { 
              message: "Employee joined successfully",
              socketId: socket.id
            });

          } catch (error) {
            console.error("❌ Error in employee_join:", error);
            socket.emit("error", { message: "Failed to join as employee" });
          }
        });

        // EMPLOYEE MESSAGE
        socket.on("employee_message", async (data) => {
          try {
            const { customerId, text, employeeId, employeeName } = data;
            console.log('📨 Employee message event:', data);

            if (!customerId || !text || !employeeId) {
              socket.emit("error", { message: "Customer ID, text and employee ID are required" });
              return;
            }

            // Save message to database
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

            // Get saved message with employee name
            const [savedMessage] = await executeQuery(
              `SELECT m.*, ep.name as employee_name 
               FROM messages m 
               LEFT JOIN employee_profile ep ON m.employee_id = ep.id 
               WHERE m.id = ?`,
              [result.insertId]
            );

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
              message: messageData
            });

            // Send confirmation to employee
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

        // TYPING INDICATORS
        socket.on("typing_start", (data) => {
          const { customerId, userType, userName } = data;
          
          if (userType === 'customer') {
            socket.to("employees").emit("customer_typing", {
              customerId,
              customerName: userName,
              typing: true
            });
          } else if (userType === 'employee') {
            socket.to(`customer_${customerId}`).emit("employee_typing", {
              employeeName: userName,
              typing: true
            });
          }
        });

        socket.on("typing_stop", (data) => {
          const { customerId, userType } = data;
          
          if (userType === 'customer') {
            socket.to("employees").emit("customer_typing", {
              customerId,
              typing: false
            });
          } else if (userType === 'employee') {
            socket.to(`customer_${customerId}`).emit("employee_typing", {
              typing: false
            });
          }
        });

        // Handle disconnect
        socket.on("disconnect", (reason) => {
          console.log("❌ User disconnected:", socket.id, "Reason:", reason);
        });

        socket.on("error", (error) => {
          console.error("🔴 Socket error:", error);
        });

      });

      // Store io instance
      res.socket.server.io = io;
      console.log("✅ Socket.IO server setup completed");

    } catch (error) {
      console.error("❌ Error setting up Socket.IO:", error);
      return res.status(500).json({ error: "Failed to setup WebSocket" });
    }
  } else {
    console.log("✅ Socket.IO server already running");
    io = res.socket.server.io;
  }
  
  res.end();
}