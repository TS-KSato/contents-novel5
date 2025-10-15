<?php
/**
 * 署名付き音楽URL生成API
 * 
 * 使い方:
 * GET /api/get-audio-url.php?track_id=track001
 * 
 * レスポンス:
 * {
 *   "url": "https://yourdomain.com/assets/audio/track001.mp3?token=xxx&expires=xxx",
 *   "expires_at": "2025-10-15T12:00:00Z"
 * }
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// CORS設定（必要に応じて調整）
$allowed_origin = 'https://yourdomain.com';
if (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] === $allowed_origin) {
    header("Access-Control-Allow-Origin: {$allowed_origin}");
    header('Access-Control-Allow-Credentials: true');
}

// セッション開始（ユーザー認証に使用）
session_start();

// 設定
define('SECRET_KEY', 'your-very-secret-key-change-this'); // 環境変数から読み込むことを推奨
define('TOKEN_EXPIRY', 3600); // 1時間
define('AUDIO_DIR', __DIR__ . '/../assets/audio/');
define('BASE_URL', 'https://yourdomain.com/assets/audio/');

// レート制限設定
define('MAX_REQUESTS_PER_HOUR', 100);
define('MAX_REQUESTS_PER_DAY', 500);

/**
 * リクエスト検証
 */
function validateRequest() {
    // GETメソッドのみ許可
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        return ['error' => 'Method not allowed'];
    }

    // track_idパラメータチェック
    if (!isset($_GET['track_id'])) {
        http_response_code(400);
        return ['error' => 'track_id is required'];
    }

    // track_idの検証（英数字とハイフンのみ）
    $trackId = $_GET['track_id'];
    if (!preg_match('/^[a-zA-Z0-9\-_]+$/', $trackId)) {
        http_response_code(400);
        return ['error' => 'Invalid track_id format'];
    }

    // パストラバーサル攻撃対策
    if (strpos($trackId, '..') !== false || strpos($trackId, '/') !== false) {
        http_response_code(400);
        return ['error' => 'Invalid track_id'];
    }

    return ['track_id' => $trackId];
}

/**
 * レート制限チェック
 */
function checkRateLimit($userId) {
    // Redis/Memcachedを使うのが理想だが、ここではセッションで簡易実装
    $now = time();
    $hourKey = 'rate_limit_hour_' . floor($now / 3600);
    $dayKey = 'rate_limit_day_' . date('Y-m-d');

    if (!isset($_SESSION[$hourKey])) {
        $_SESSION[$hourKey] = 0;
    }
    if (!isset($_SESSION[$dayKey])) {
        $_SESSION[$dayKey] = 0;
    }

    // レート制限チェック
    if ($_SESSION[$hourKey] >= MAX_REQUESTS_PER_HOUR) {
        http_response_code(429);
        return ['error' => 'Too many requests (hourly limit)'];
    }
    if ($_SESSION[$dayKey] >= MAX_REQUESTS_PER_DAY) {
        http_response_code(429);
        return ['error' => 'Too many requests (daily limit)'];
    }

    // カウント増加
    $_SESSION[$hourKey]++;
    $_SESSION[$dayKey]++;

    return true;
}

/**
 * 音楽ファイルの存在確認
 */
function checkFileExists($trackId) {
    $filePath = AUDIO_DIR . $trackId . '.mp3';
    
    if (!file_exists($filePath)) {
        http_response_code(404);
        return ['error' => 'Track not found'];
    }

    // ファイルが本当にaudioディレクトリ内にあることを確認（セキュリティ）
    $realPath = realpath($filePath);
    $audioRealPath = realpath(AUDIO_DIR);
    
    if (strpos($realPath, $audioRealPath) !== 0) {
        http_response_code(403);
        return ['error' => 'Access denied'];
    }

    return true;
}

/**
 * 署名付きURLを生成
 */
function generateSignedUrl($trackId, $expiresAt) {
    $filename = $trackId . '.mp3';
    
    // 署名を生成
    $signature = hash_hmac('sha256', $filename . $expiresAt, SECRET_KEY);
    
    // URLを構築
    $url = BASE_URL . $filename . '?' . http_build_query([
        'token' => $signature,
        'expires' => $expiresAt
    ]);
    
    return $url;
}

/**
 * ログ記録
 */
function logAccess($trackId, $userId) {
    $logFile = __DIR__ . '/../logs/audio_access.log';
    $logEntry = sprintf(
        "[%s] User: %s | Track: %s | IP: %s | UserAgent: %s\n",
        date('Y-m-d H:i:s'),
        $userId ?? 'anonymous',
        $trackId,
        $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    );
    
    @file_put_contents($logFile, $logEntry, FILE_APPEND);
}

// ========================================
// メイン処理
// ========================================

try {
    // リクエスト検証
    $validation = validateRequest();
    if (isset($validation['error'])) {
        echo json_encode($validation);
        exit;
    }
    
    $trackId = $validation['track_id'];
    $userId = $_SESSION['user_id'] ?? null;
    
    // レート制限チェック
    $rateLimitCheck = checkRateLimit($userId);
    if (is_array($rateLimitCheck) && isset($rateLimitCheck['error'])) {
        echo json_encode($rateLimitCheck);
        exit;
    }
    
    // ファイル存在確認
    $fileCheck = checkFileExists($trackId);
    if (is_array($fileCheck) && isset($fileCheck['error'])) {
        echo json_encode($fileCheck);
        exit;
    }
    
    // 有効期限を設定
    $expiresAt = time() + TOKEN_EXPIRY;
    
    // 署名付きURLを生成
    $signedUrl = generateSignedUrl($trackId, $expiresAt);
    
    // アクセスログ記録
    logAccess($trackId, $userId);
    
    // レスポンス返却
    http_response_code(200);
    echo json_encode([
        'url' => $signedUrl,
        'expires_at' => date('c', $expiresAt),
        'expires_in' => TOKEN_EXPIRY
    ]);
    
} catch (Exception $e) {
    error_log('Signed URL generation error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>
