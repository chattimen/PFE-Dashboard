<?php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Serve API
if (strpos($uri, '/api/') === 0) {
    require_once __DIR__ . '/backend/api/index.php';
    exit;
}

// Serve static assets from /frontend/assets/
if (strpos($uri, '/assets/') === 0) {
    $file = __DIR__ . '/frontend' . $uri;
    if (file_exists($file)) {
        $extension = pathinfo($file, PATHINFO_EXTENSION);
        switch ($extension) {
            case 'css':
                header('Content-Type: text/css');
                break;
            case 'js':
                header('Content-Type: application/javascript');
                break;
            case 'png':
                header('Content-Type: image/png');
                break;
            case 'jpg':
            case 'jpeg':
                header('Content-Type: image/jpeg');
                break;
            case 'svg':
                header('Content-Type: image/svg+xml');
                break;
        }
        readfile($file);
        exit;
    } else {
        http_response_code(404);
        echo "404 Not Found";
        exit;
    }
}

// Serve additional frontend views (e.g., project.html)
if (strpos($uri, '/views/') === 0) {
    $file = __DIR__ . '/frontend' . $uri;
    if (file_exists($file)) {
        header('Content-Type: text/html');
        readfile($file);
        exit;
    } else {
        http_response_code(404);
        echo "404 Not Found";
        exit;
    }
}

// Serve index.html from /frontend for root
if ($uri === '/' || $uri === '') {
    require_once __DIR__ . '/frontend/views/index.html';
    exit;
}

// Default fallback
http_response_code(404);
echo "404 Not Found";

