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
      });
      res.socket.server.io = io;
      try { global._io = io; } catch (e) {}
      console.log('Socket.io server created successfully');
      
      io.on("connection", (socket) => {
        console.log('New socket connection:', socket.id);
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
                 VALUES (?, NOW(), 'awaiting') 
                 ON DUPLICATE KEY UPDATE last_message_at = NOW(), status = 'awaiting'`,
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
            io.to("employees").emit("customer_message_notification", {
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
            socket.join("employees");
            if (role) {
              socket.join(`role_${String(role).toLowerCase()}`);
            }
            socket.employeeId = employeeId;
            socket.userType = "employee";
            socket.userName = employeeName;
            console.log(`Employee ${employeeName} (${employeeId}) joined successfully`);
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
            socket.emit("error", { message: "Failed to send message" });
          }
        });
        socket.on("employee_accept_chat", async (data) => {
          try {
            const { customerId, employeeId, employeeName } = data;
            if (!customerId || !employeeId) {
              socket.emit("error", { message: "Customer ID and employee ID are required" });
              return;
            }
            await executeQuery(
              `UPDATE chat_sessions SET employee_id = ?, status = 'assigned', last_message_at = NOW() 
               WHERE customer_id = ?`,
              [employeeId, customerId]
            );
            io.to("employees").emit("chat_assigned", {
              customerId,
              employeeId,
              employeeName,
            });
            io.to(`customer_${customerId}`).emit("employee_assigned", {
              employeeId,
              employeeName,
            });
          } catch (error) {
            socket.emit("error", { message: "Failed to accept chat" });
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
          if (socket.customerId) {
            socket.leave(`customer_${socket.customerId}`);
          }
          if (socket.employeeId) {
            socket.leave("employees");
          }
        });
      });
    } catch (e) {
      res.status(500).json({ error: e.message || "Socket server init failed" });
      return;
    }
  } else {
    io = res.socket.server.io;
    try { global._io = io; } catch (e) {}
  }
  res.end("ok");
}
