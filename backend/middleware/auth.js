const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        console.warn('AUTH: No token received in x-auth-token header');
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('AUTH: Token verification failed:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
