<?php
/**
 * SSO Login Endpoint for Old Website
 * This file receives SSO token from new website and logs in the user
 */

// Database configuration
$host = 'localhost';
$dbname = 'your_database_name';
$username = 'your_username';
$password = 'your_password';

try {
    // Connect to database
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get POST data
    $ssoToken = $_POST['sso_token'] ?? '';
    $userInfo = json_decode($_POST['user_info'] ?? '{}', true);
    $redirectUrl = $_POST['redirect_url'] ?? '/dashboard.php';
    
    if (empty($ssoToken)) {
        throw new Exception('SSO token is required');
    }
    
    // Verify SSO token in database
    $stmt = $pdo->prepare("
        SELECT st.*, ep.name, ep.email, ep.role, ep.emp_code 
        FROM sso_tokens st 
        JOIN employee_profile ep ON st.user_id = ep.id 
        WHERE st.token = ? 
        AND st.expires_at > NOW() 
        AND st.is_used = FALSE 
        LIMIT 1
    ");
    $stmt->execute([$ssoToken]);
    $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tokenData) {
        throw new Exception('Invalid or expired SSO token');
    }
    
    // Mark token as used
    $updateStmt = $pdo->prepare("
        UPDATE sso_tokens 
        SET is_used = TRUE, used_at = NOW() 
        WHERE id = ?
    ");
    $updateStmt->execute([$tokenData['id']]);
    
    // Start session and login user
    session_start();
    
    // Set session variables (adjust according to your old website's session structure)
    $_SESSION['user_id'] = $tokenData['user_id'];
    $_SESSION['user_name'] = $tokenData['name'];
    $_SESSION['user_email'] = $tokenData['email'];
    $_SESSION['user_role'] = $tokenData['role'];
    $_SESSION['emp_code'] = $tokenData['emp_code'];
    $_SESSION['logged_in'] = true;
    $_SESSION['login_time'] = time();
    $_SESSION['sso_login'] = true; // Flag to indicate SSO login
    
    // Optional: Set cookies for remember me
    setcookie('user_id', $tokenData['user_id'], time() + (86400 * 30), '/');
    setcookie('user_name', $tokenData['name'], time() + (86400 * 30), '/');
    setcookie('user_role', $tokenData['role'], time() + (86400 * 30), '/');
    
    // Log the SSO login
    $logStmt = $pdo->prepare("
        INSERT INTO login_logs (user_id, login_time, login_type, ip_address, user_agent) 
        VALUES (?, NOW(), 'SSO', ?, ?)
    ");
    $logStmt->execute([
        $tokenData['user_id'],
        $_SERVER['REMOTE_ADDR'] ?? '',
        $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
    
    // Redirect to dashboard or specified URL
    header('Location: ' . $redirectUrl);
    exit;
    
} catch (Exception $e) {
    // Log error
    error_log('SSO Login Error: ' . $e->getMessage());
    
    // Redirect to login page with error
    $errorMsg = urlencode('SSO login failed: ' . $e->getMessage());
    header('Location: /login.php?error=' . $errorMsg);
    exit;
}
?>
