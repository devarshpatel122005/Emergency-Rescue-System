module.exports = {
  email: process.env.ADMIN_EMAIL || 'admin@ers.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  profile: {
    _id: 'admin-static',
    name: 'System Admin',
    email: process.env.ADMIN_EMAIL || 'admin@ers.com',
    role: 'admin',
    profileComplete: true,
    age: 30,
    gender: 'Other',
    blood_group: 'O+',
    phone: '9999999999'
  }
};
