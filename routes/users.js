const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')

router.get(`/`, async (req, res) => {
    // const userList = await User.find().select('name phone email');
    const userList = await User.find().select('-passwordHash');
    if (!userList) {
        res.status(500).json({ success: false })
    }
    res.send(userList);
});

// get user by id
router.get('/:id', async (req, res) => {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) {
        res.status(500).json({ message: 'Không tìm thấy user với id đã gửi lên!' })
    }

    res.status(200).send(user);
})

// register user
router.post('/register', async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country
    });
    const userList = await User.find().select('email');
    console.log(userList)

    let duplicate = false;

    for (let i = 0; i < userList.length; i++) {
        const email = userList[i].email;
        if (email === req.body.email) {
            duplicate = true
        } else {

        }
    }
    if (duplicate == true) {
        return res.status(409).json({ message: 'Người dùng với email này đã tồn tại!' })
    } else {
        user = await user.save();
        if (!user) {
            res.status(500).json({ success: false })
        }
        return res.status(200).json({ success: true, message: "Đăng ký thành công!", data: user })
    }

});

// login user
router.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email })
    const secret = process.env.secret;
    if (!user) {
        return res.status(400).json({ message: 'Người dùng không tồn tại!' })
    }

    if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                expiresIn: "2h"
            },
            secret
        )
        return res.status(200).json({
            message: 'Đăng nhập thành công!',
            user: user,
            token: token
        });
    } else {
        return res.status(404).json({ message: 'Tên người dùng/mật khẩu đăng nhập không đúng!' });
    }

});

// get user count
router.get(`/get/count`, async (req, res) => {
    const userCount = await User.countDocuments((count) => count);

    if (userCount) {
        return res.status(200).json({ success: true, message: "Lấy số lượng người dùng thành công!", data: userCount });
    } else {
        return res.status(500).json({ success: false, message: "Danh sách người dùng rỗng!" });
    }
});

// delete user
router.delete('/:id', (req, res) => {
    User.findByIdAndRemove(req.params.id).then((user) => {
        if (user) {
            return res.status(200).json({ success: true, message: "Đã xóa người dùng!" });
        } else {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng!" })
        }
    }).catch(err => {
        return res.status(400).json({ success: false, error: err });
    })
});

// general otp
router.get('/otp/:id', (req, res) => {
    let uId = req.params.id;
    var val = Math.floor(1000 + Math.random() * 9000);
    return res.status(200).json({"uid":uId,"otp":val})
})

// recovery password with email
router.post('/recovery', async (req, res) => {
    const user = await User.findOne({ email: req.body.email })
    if (!user) {
        res.status(400).json({ success: false, message: "Khôi phục mật khẩu lỗi!" })
    }
    const token = jwt.sign({ _id: user._id }, process.env.RESET_PASSWORD_KEY, { expiresIn: '15m' })
    const data = {
        from: 'noreply@hello.com',
        to: req.body.email,
        subject: 'Khôi phục mật khẩu',
        html: `
            <h3>Vui lòng nhấn vào đường dẫn bên dưới để khôi phục mật khẩu</h3>
            <p>Lưu ý: đường dẫn sẽ hết hiệu lực trong 15p nữa</p>
            <a>${req.protocol}://${req.get('host')}/resetpassword/${token}</a>
        `
    }
    return User.updateOne({ resetLink: token }, (err, result) => {
        if (err) {
            return res.status(400).json({ success: false, error: "Reset password link error!!!" })
        } else {
            return res.status(200).json({ success: true, message: "Email đã được gửi đến email " + req.body.email, data: data })
        }
    })
})
module.exports = router;