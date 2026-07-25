const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');

// Your Firebase Admin SDK credentials (already filled)
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: "thearkplatform",
    clientEmail: "firebase-adminsdk-fbsvc@thearkplatform.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDOFGL/ROcapLVx\nFY9pAmSFhvOJvjxUsl/p3IBerVeovxP0PdX+VCYTF76usG4B84Li+1W0fbwNnU4h\nzLrniELqX8M8ptmyTkijG8C015Vi43VENNSB1ISIaNMhRXs7zBHrrmzqQTVQkwJu\nwvvd056Siri0FjS5B1MkDkOjIW80Sf1xNHpKPi79FyvBTJrgz2gzKurc1qSfuR56\nT10cEu9u3UzET0b8ScFhInj5WlKhcNriVYqRPnkkW6elsVEAm8wLSuFzwKAZDYEm\n1H5o6Sc/0dfouol94H3JOtYx1amEg8qxEq/A9tP+jPxn8HVFv/ctjH81W4SvHiyV\nwKIhPGqlAgMBAAECggEAMBULoBm4fjvt5autIUggohMBoaLUOsK/pDYBcZWqPUIP\n6s2+ry99DrlckS+zCxuA72rK7WjkxpxsTXCSL1FYo4yiZfVcF8EyK3RfOxKN1VvS\n0Y4uAvjNz3H9yOaIQUR07fNtkB6UzO7wA13VHEWy2ugo/kOsG3u9B02YtGgppR4u\n6BS9CHLXW6ofkfsukx0o/xk+Zavw0Pe6KH/C0VGtQp4GjJI7KUVluYmeYQu+bX4v\nYcMRowr3qj+scJPWfzSAR6q9Wi9g9vk5RirsURt5Rb8bvb2BP3DeR/yoHZqTL+2n\nvOIBhXipbOALe+CM2AJwuSppEBdiODqS9/uKRjrroQKBgQD19GkbK8mAaDYV3tDm\n3l32d9vNdA62JlBlLj4+aFh68YiqMS89QW7T4x1545tzh1I+nSRohO/HaoVJPGfi\nhcxqJRWARc8uA1uiAzSxvbmFV7eKnErjI25npsHeNwAWwjn455IWciq7NI1aZQoP\ndKQk3yajPkMlpzau1Dg+peGv/QKBgQDWfw9+Cb+JwflKUYlFghq4MaL3dPaiGW+A\njh1rfuZCQk+K8SJrejBPs4EJ0nU7mM/TRKpWZeZY1vZq/zjwh6axCQgCQRmwyz2U\nFCsM347jKayeJcqxPIamb2+btgN7pY/bOHR82vlRgGS22zRV+DrMZygpXwm7zdjO\nKGt4mOJByQKBgQCV0AUBjt9S/qcLFUhrh8D2MrXI5EtdueK4br1tKAPVBzA2cnUS\nu7t1Bt7acsAqU5/OEcuuemLPNdvv6wJgIR2M/f+lvV/f6B21hnxfU3Agf3iFzoNy\n7Q7/xbxKzXeZZT8IlI0QbQQIOY9sIyVImsSszNvtDSy7T6noPc3wovvgRQKBgBP4\npKKhmbnj26g1y0gzgvVfecL8mvIg2CbqFIcru5izv+A573B+Yf0pw3v8onm4ErGj\nFREST845xZvUw6Jxnu2g36QGF7REWClvb0q1jgJMoQvgjOzPq+HXQlcHLW/XzHsm\n2IG/ibMy9y2nX0oZ4K+jczPW63sXAXbAgLEr2vUxAoGBAOG2Y5XxqvP5BvAB8kl2\nIxg802+j5xkyd2fYo3idB0mTZtdFJmJJKl8AeznUC5wu6mbzejnK3xZeZ5z4r05g\nQix6A8EiclKLWWnCoUABWleYOLDwXCHMiDW7tRqK7U8fV0lvKXRZF6oNyE6ZqkWs\nDELssveb8wi4cksYh3cYK9g5\n-----END PRIVATE KEY-----\n"
  };

  admin.initializeApp({
    credential: cert(serviceAccount),
    projectId: "thearkplatform",
    storageBucket: "thearkplatform.firebasestorage.app"
  });
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };