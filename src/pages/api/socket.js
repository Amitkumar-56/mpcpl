// src/pages/api/socket.js
import { executeQuery } from "@/lib/db";

let io;

export default function SocketHandler(req, res) {

  console.log('Socket handler called');

  if (res.headersSent) {

    console.log('Headers already sent, returning');

    return res.end();

  }

  if (!res.socket.server.io) {

    console.log('Initializing new Socket.io server');

    try {

      const { Server } = require("socket.io");

      io = new Server(res.socket.server, {

        path: "/api/socket",

        cors: {

          origin:

            process.env.NODE_ENV === "production"

              ? ["https://yourdomain.com"]

              : true,

          methods: ["GET", "POST"],

          credentials: true,

        },

        transports: ["websocket", "polling"],

        allowEIO3: true,

        pingInterval: 25000,

        pingTimeout: 60000,

        reconnection: true,

        reconnectionAttempts: 5,

        reconnectionDelay: 1000,

      });

      res.socket.server.io = io;

      try { global._io = io; } catch (e) {}

      console.log('Socket.io server created successfully');

      

      io.on("connection", (socket) => {

        console.log('✅ New socket connection:', socket.id);

        socket.on("customer_join", async (data) => {

          try {

            const { customerId, customerName } = data;

            if (!customerId) {

              socket.emit("error", { message: "Customer ID is required" });

              return;

            }

            await socket.join(`customer_${customerId}`);

            socket.customerId = customerId;

            socket.userType = "customer";

            socket.userName = customerName;

            socket.emit("joined_success", {

              message: "Successfully joined chat",

              customerId,

              socketId: socket.id,

            });

          } catch (error) {

            console.error('Customer join error:', error);

            socket.emit("error", { message: "Failed to join chat" });

          }

        });

        socket.on("customer_message", async (data) => {

          try {

            const { customerId, text, customerName, tempId, messageId } = data;

            if (!customerId || !text) {

              socket.emit("error", { message: "Customer ID and text are required" });

              return;

            }

            let savedMessage;

            if (messageId) {

              const [row] = await executeQuery(

                `SELECT m.*, c.name as customer_name 

                 FROM messages m 

                 LEFT JOIN customers c ON m.customer_id = c.id 

                 WHERE m.id = ?`,

                [messageId]

              );

              savedMessage = row;

            } else {

              const result = await executeQuery(

                `INSERT INTO messages (text, sender, customer_id, status, timestamp) 

                 VALUES (?, 'customer', ?, 'sent', NOW())`,

                [text, customerId]

              );

              await executeQuery(

                `INSERT INTO chat_sessions (customer_id, last_message_at, status) 

                 VALUES (?, NOW(), 'active') 

                 ON DUPLICATE KEY UPDATE last_message_at = NOW(), status = 'active'`,

                [customerId]

              );

              const [row] = await executeQuery(

                `SELECT m.*, c.name as customer_name 

                 FROM messages m 

                 LEFT JOIN customers c ON m.customer_id = c.id 

                 WHERE m.id = ?`,

                [result.insertId]

              );

              savedMessage = row;

            }

            const messageData = {

              id: savedMessage.id,

              text: savedMessage.text,

              sender: savedMessage.sender,

              customer_id: savedMessage.customer_id,

              status: savedMessage.status,

              timestamp: savedMessage.timestamp,

            };

            io.to(`customer_${customerId}`).emit("new_message", {

              message: messageData,

            });

            // Broadcast to employees except drivers (role 6)

            io.to("employees").except("role_6").emit("customer_message_notification", {

              type: "new_customer_message",

              customerId,

              customerName: savedMessage.customer_name || customerName,

              messageId: savedMessage.id,

              text: savedMessage.text,

              timestamp: savedMessage.timestamp,

              status: savedMessage.status,

            });

            socket.emit("message_sent", {

              messageId: savedMessage.id,

              tempId: tempId,

              status: "sent",

            });

          } catch (error) {

            console.error('Customer message error:', error);

            socket.emit("error", { message: "Failed to send message" });

          }

        });

        socket.on("employee_join", (data) => {

          try {

            console.log('Employee join request:', data);

            const { employeeId, employeeName, role } = data;

            if (!employeeId) {

              socket.emit("error", { message: "Employee ID is required" });

              return;

            }

            

            // Join general employees room

            socket.join("employees");

            

            // Join role-specific room

            if (role) {

              socket.join(`role_${String(role).toLowerCase()}`);

            }

            

            // Join employee-specific room for internal messages

            socket.join(`employee_${employeeId}`);

            

            socket.employeeId = employeeId;

            socket.userType = "employee";

            socket.userName = employeeName;

            socket.userRole = role;

            

            console.log(`👨‍💼 Employee ${employeeName} (${employeeId}) joined successfully - Role: ${role}`);

            socket.emit("employee_joined", {

              message: "Employee joined successfully",

              socketId: socket.id,

            });

          } catch (error) {

            console.error('Employee join error:', error);

            socket.emit("error", { message: "Failed to join as employee" });

          }

        });

        socket.on("employee_message", async (data) => {

          try {

            const { customerId, text, employeeId, employeeName, messageId } = data;

            if (!customerId || !text || !employeeId) {

              socket.emit("error", { message: "Customer ID, text and employee ID are required" });

              return;

            }

            let savedMessage;

            if (messageId) {

              const [row] = await executeQuery(

                `SELECT m.*, ep.name as employee_name 

                 FROM messages m 

                 LEFT JOIN employee_profile ep ON m.employee_id = ep.id 

                 WHERE m.id = ?`,

                [messageId]

              );

              savedMessage = row;

            } else {

              const result = await executeQuery(

                `INSERT INTO messages (text, sender, customer_id, employee_id, status, timestamp) 

                 VALUES (?, 'employee', ?, ?, 'delivered', NOW())`,

                [text, customerId, employeeId]

              );

              await executeQuery(

                `UPDATE chat_sessions SET employee_id = ?, last_message_at = NOW(), status = 'active' 

                 WHERE customer_id = ?`,

                [employeeId, customerId]

              );

              const [row] = await executeQuery(

                `SELECT m.*, ep.name as employee_name 

                 FROM messages m 

                 LEFT JOIN employee_profile ep ON m.employee_id = ep.id 

                 WHERE m.id = ?`,

                [result.insertId]

              );

              savedMessage = row;

            }

            const messageData = {

              id: savedMessage.id,

              text: savedMessage.text,

              sender: savedMessage.sender,

              customer_id: savedMessage.customer_id,

              employee_id: savedMessage.employee_id,

              status: savedMessage.status,

              timestamp: savedMessage.timestamp,

              employee_name: savedMessage.employee_name || employeeName,

            };

            io.to(`customer_${customerId}`).emit("new_message", {

              message: messageData,

            });

            socket.emit("message_sent", {

              messageId: savedMessage.id,

              status: "delivered",

            });

          } catch (error) {

            console.error('Employee message error:', error);

            socket.emit("error", { message: "Failed to send message" });

          }

        });

        socket.on("internal_message", async (data) => {

          try {

            const { receiverId, text, senderId, senderName } = data;

            if (!receiverId || !text || !senderId) {

              socket.emit("error", { message: "Receiver ID, text and sender ID are required" });

              return;

            }

            // Save internal message

            const result = await executeQuery(

              `INSERT INTO internal_messages (sender_id, receiver_id, text, timestamp) VALUES (?, ?, ?, NOW())`,

              [senderId, receiverId, text]

            );

            // Get saved message with employee names

            const [savedMessage] = await executeQuery(

              `SELECT im.*, ep_sender.name as sender_name, ep_receiver.name as receiver_name

               FROM internal_messages im

               LEFT JOIN employee_profile ep_sender ON im.sender_id = ep_sender.id

               LEFT JOIN employee_profile ep_receiver ON im.receiver_id = ep_receiver.id

               WHERE im.id = ?`,

              [result.insertId]

            );

            const messageData = {

              id: savedMessage.id,

              senderId: savedMessage.sender_id,

              receiverId: savedMessage.receiver_id,

              text: savedMessage.text,

              timestamp: savedMessage.timestamp,

              senderName: savedMessage.sender_name || senderName,

              receiverName: savedMessage.receiver_name

            };

            // Send to receiver

            io.to(`employee_${receiverId}`).emit('internal_message', messageData);

            // Send confirmation to sender

            socket.emit('internal_message_sent', messageData);

          } catch (error) {

            console.error('Internal message error:', error);

            socket.emit("error", { message: "Failed to send internal message" });

          }

        });

        socket.on("employee_accept_chat", async (data) => {

          try {

            const { customerId, employeeId, employeeName } = data;

            if (!customerId || !employeeId) {

              socket.emit("error", { message: "Customer ID and employee ID are required" });

              return;

            }

            // Atomic update: Only assign if not already assigned

            const result = await executeQuery(

              "UPDATE chat_sessions SET employee_id = ?, status = 'active', last_message_at = NOW() WHERE customer_id = ? AND (employee_id IS NULL OR employee_id = '')",

              [employeeId, customerId]

            );

            if (result.affectedRows === 0) {

              // Chat was already assigned

              const [existing] = await executeQuery(

                "SELECT employee_id FROM chat_sessions WHERE customer_id = ?",

                [customerId]

              );

              socket.emit("chat_accept_failed", {

                customerId,

                message: "Chat already accepted by another employee",

                assignedTo: existing?.employee_id

              });

              return;

            }

            // Broadcast successful assignment (excluding drivers)

            io.to("employees").except("role_6").emit("chat_assigned", {

              customerId,

              employeeId,

              employeeName,

            });

            io.to(`customer_${customerId}`).emit("employee_assigned", {

              employeeId,

              employeeName,

            });

            socket.emit("chat_accept_success", {

              customerId,

              employeeId,

              message: "Chat accepted successfully"

            });

          } catch (error) {

            console.error('Accept chat error:', error);

            socket.emit("error", { message: "Failed to accept chat" });

          }

        });

        // Employee-to-Employee Chat Events
        socket.on("employee_chat_request", async (data) => {
          try {
            const { requesterId, responderId, requestMessage } = data;

            if (!requesterId || !responderId) {
              socket.emit("error", { message: "Requester ID and responder ID are required" });
              return;
            }

            // Save chat request to database
            const result = await executeQuery(
              `INSERT INTO employee_sessions (requester_id, responder_id, status, request_message) 
               VALUES (?, ?, 'pending', ?)`,
              [requesterId, responderId, requestMessage || '']
            );

            if (result.affectedRows > 0) {
              // Get session details with employee info
              const sessionDetails = await executeQuery(
                `SELECT 
                  es.id,
                  es.requester_id,
                  es.responder_id,
                  es.status,
                  es.request_message,
                  es.created_at,
                  requester.name as requester_name,
                  requester.picture as requester_picture,
                  responder.name as responder_name,
                  responder.picture as responder_picture
                FROM employee_sessions es
                LEFT JOIN employee_profile requester ON es.requester_id = requester.id
                LEFT JOIN employee_profile responder ON es.responder_id = responder.id
                WHERE es.id = ?`,
                [result.insertId]
              );

              const sessionData = sessionDetails[0];

              // Send notification to responder
              io.to(`employee_${responderId}`).emit('employee_chat_request_received', sessionData);

              // Send confirmation to requester
              socket.emit('employee_chat_request_sent', sessionData);

              console.log(`📨 Employee chat request: ${requesterId} -> ${responderId}`);
            }

          } catch (error) {
            console.error('Employee chat request error:', error);
            socket.emit("error", { message: "Failed to send chat request" });
          }
        });

        socket.on("employee_chat_respond", async (data) => {
          try {
            const { sessionId, responderId, action } = data;

            if (!sessionId || !responderId || !['accept', 'reject'].includes(action)) {
              socket.emit("error", { message: "Invalid data" });
              return;
            }

            // Update session status
            const newStatus = action === 'accept' ? 'active' : 'rejected';
            const result = await executeQuery(
              `UPDATE employee_sessions SET status = ?, updated_at = NOW() WHERE id = ?`,
              [newStatus, sessionId]
            );

            if (result.affectedRows > 0) {
              // Get updated session with employee details
              const sessionDetails = await executeQuery(
                `SELECT 
                  es.id,
                  es.requester_id,
                  es.responder_id,
                  es.status,
                  es.request_message,
                  es.created_at,
                  es.updated_at,
                  requester.name as requester_name,
                  requester.picture as requester_picture,
                  responder.name as responder_name,
                  responder.picture as responder_picture
                FROM employee_sessions es
                LEFT JOIN employee_profile requester ON es.requester_id = requester.id
                LEFT JOIN employee_profile responder ON es.responder_id = responder.id
                WHERE es.id = ?`,
                [sessionId]
              );

              const sessionData = sessionDetails[0];

              // Notify the original requester
              io.to(`employee_${sessionData.requester_id}`).emit('employee_chat_response_received', {
                sessionId,
                action,
                session: sessionData
              });

              // Send confirmation to responder
              socket.emit('employee_chat_response_sent', {
                sessionId,
                action,
                session: sessionData
              });

              console.log(`📝 Employee chat response: ${responderId} ${action} session ${sessionId}`);
            }

          } catch (error) {
            console.error('Employee chat response error:', error);
            socket.emit("error", { message: "Failed to respond to chat request" });
          }
        });

        socket.on("employee_chat_message", async (data) => {
          try {
            const { sessionId, senderId, receiverId, message, messageType = 'text' } = data;

            if (!sessionId || !senderId || !receiverId || !message) {
              socket.emit("error", { message: "Missing required fields" });
              return;
            }

            // Save message to database
            const result = await executeQuery(
              `INSERT INTO chat_messages (session_id, sender_id, receiver_id, message, message_type, status) 
               VALUES (?, ?, ?, ?, ?, 'sent')`,
              [sessionId, senderId, receiverId, message, messageType]
            );

            if (result.affectedRows > 0) {
              // Update session timestamp
              await executeQuery(
                `UPDATE employee_sessions SET updated_at = NOW() WHERE id = ?`,
                [sessionId]
              );

              // Get complete message with employee details
              const messageDetails = await executeQuery(
                `SELECT 
                  cm.id,
                  cm.session_id,
                  cm.sender_id,
                  cm.receiver_id,
                  cm.message,
                  cm.message_type,
                  cm.status,
                  cm.created_at,
                  sender.name as sender_name,
                  sender.picture as sender_picture,
                  receiver.name as receiver_name,
                  receiver.picture as receiver_picture
                FROM chat_messages cm
                LEFT JOIN employee_profile sender ON cm.sender_id = sender.id
                LEFT JOIN employee_profile receiver ON cm.receiver_id = receiver.id
                WHERE cm.id = ?`,
                [result.insertId]
              );

              const messageData = messageDetails[0];

              // Send message to receiver
              io.to(`employee_${receiverId}`).emit('employee_chat_message_received', messageData);

              // Send confirmation to sender
              socket.emit('employee_chat_message_sent', messageData);

              console.log(`💬 Employee chat message: ${senderId} -> ${receiverId} (session: ${sessionId})`);
            }

          } catch (error) {
            console.error('Employee chat message error:', error);
            socket.emit("error", { message: "Failed to send message" });
          }
        });

        socket.on("employee_chat_typing", (data) => {
          try {
            const { sessionId, receiverId, isTyping, senderName } = data;

            if (!sessionId || !receiverId) return;

            // Send typing indicator to receiver
            io.to(`employee_${receiverId}`).emit('employee_chat_typing_indicator', {
              sessionId,
              isTyping,
              senderName
            });

          } catch (error) {
            console.error('Employee chat typing error:', error);
          }
        });

        socket.on("employee_chat_mark_read", async (data) => {
          try {
            const { sessionId, employeeId, messageIds } = data;

            if (!sessionId || !employeeId) return;

            let updateResult;

            if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
              // Mark specific messages as read
              const placeholders = messageIds.map(() => '?').join(',');
              updateResult = await executeQuery(
                `UPDATE chat_messages 
                 SET status = 'read', read_at = NOW() 
                 WHERE id IN (${placeholders}) AND receiver_id = ? AND session_id = ?`,
                [...messageIds, employeeId, sessionId]
              );
            } else {
              // Mark all unread messages in the session as read
              updateResult = await executeQuery(
                `UPDATE chat_messages 
                 SET status = 'read', read_at = NOW() 
                 WHERE receiver_id = ? AND session_id = ? AND status != 'read'`,
                [employeeId, sessionId]
              );
            }

            // Notify the other employee that messages were read
            const session = await executeQuery(
              `SELECT requester_id, responder_id FROM employee_sessions WHERE id = ?`,
              [sessionId]
            );

            if (session.length > 0) {
              const otherEmployeeId = session[0].requester_id === employeeId 
                ? session[0].responder_id 
                : session[0].requester_id;

              io.to(`employee_${otherEmployeeId}`).emit('employee_chat_messages_read', {
                sessionId,
                readBy: employeeId,
                count: updateResult.affectedRows
              });
            }

          } catch (error) {
            console.error('Employee chat mark read error:', error);
          }
        });

        socket.on("typing_start", (data) => {

          const { customerId, userType, userName } = data;

          if (userType === "customer") {

            socket.to("employees").emit("customer_typing", {

              customerId,

              customerName: userName,

              typing: true,

            });

          } else if (userType === "employee") {

            socket.to(`customer_${customerId}`).emit("employee_typing", {

              employeeName: userName,

              typing: true,

            });

          }

        });

        socket.on("typing_stop", (data) => {

          const { customerId, userType } = data;

          if (userType === "customer") {

            socket.to("employees").emit("customer_typing", {

              customerId,

              typing: false,

            });

          } else if (userType === "employee") {

            socket.to(`customer_${customerId}`).emit("employee_typing", {

              typing: false,

            });

          }

        });

        socket.on("disconnect", () => {

          console.log('❌ Socket disconnected:', socket.id);

          if (socket.customerId) {

            socket.leave(`customer_${socket.customerId}`);

          }

          if (socket.employeeId) {

            socket.leave("employees");

          }

        });

      });

    } catch (e) {

      console.error('Socket server init error:', e);

      res.status(500).json({ error: e.message || "Socket server init failed" });

      return;

    }

  } else {

    io = res.socket.server.io;

    try { global._io = io; } catch (e) {}

  }

  res.end("ok");

}

