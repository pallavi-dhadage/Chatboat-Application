from app import create_app

app = create_app()

if __name__ == '__main__':
    # Run plain Flask dev server for quick local testing (no Socket.IO)
    app.run(host='127.0.0.1', port=5000, debug=True)
