const { Order } = require('../models/order');
const { OrderItem } = require("..//models/order-item");
const express = require('express');
const authJwt = require('../helpers/jwt');
const { Product } = require('../models/product');
const router = express.Router();

const app = express();

// get order list
router.get(`/`, async (req, res) => {
    const orderList = await Order.find().populate('user', 'name').sort({ 'dateOrdered': -1 });

    if (!orderList) {
        res.status(500).json({ success: false })
    }
    res.send(orderList);
});

// get order by id
router.get(`/:id`, async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name')
        .populate({
            path: 'orderItems', populate: {
                path: 'product', populate: 'category'
            }
        });

    if (!order) {
        res.status(500).json({ success: false })
    }
    res.send(order);
});

//get orderList by status
router.post(`/status`, async (req, res) => {
   console.log(req.body.status.toLowerCase())
   const orderList = await Order.find().populate('user', 'name').sort({ 'dateOrdered': -1 });
   console.log(orderList)
   const newList = []
   for (let i = 0; i < orderList.length; i++) {
        const element = orderList[i];
        if(element.status.toLowerCase()==req.body.status.toLowerCase()){
            newList.push(orderList[i])
        }else{
            
        }
    }

    res.status(200).json({ success: true, message: "Lấy danh sách hóa đơn thành công!", data: newList });
});

// orders
router.post('/', async (req, res) => {
    let productArr = []
    let totalPrice = 0;
    const { orderItems } = req.body;
    for (let i = 0; i < orderItems.length; i++) {
        const element = orderItems[i];
        const product = await Product.findById(element.product).populate('category');
        totalPrice = orderItems[i].quantity * product.price;
        productArr.push({
            image: product.image,
            name: product.name,
            price: product.price,
            quantity: orderItems[i].quantity,
            product: orderItems[i].product,
            totalPrice: totalPrice
        })
    }

    const orderItem = new Object(productArr);

    let summaryPrice = 0;
    productArr.map((item) => {
        summaryPrice += item.totalPrice
    })

    let newOrder = new Order({
        orderItems: orderItem,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        status: "shipping",
        totalPrice: summaryPrice,
        user: req.body.user
    });
    let order = await newOrder.save();

    if (order) {
        return res.status(200).json({ success: true, message: "Đặt hàng thành công!", data: order });
    } else {
        return res.status(500).json({ success: false, message: "Không thể đặt hàng!" });
    }
});

// confirm orders
router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status
        },
        { new: true }
    );

    if (order) {
        return res.status(200).json({ success: true, message: "Xác nhận đơn hàng thành công!", data: order });
    } else if (order == null) {
        return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng!" });
    }
    else {
        return res.status(500).json({ success: false, message: "Không thể xác nhận đơn hàng!" });
    }
});

//delete order
router.delete('/:id', (req, res) => {
    Order.findByIdAndRemove(req.params.id).then(async (order) => {
        if (order) {
            await order.orderItems.map(async orderItem => {
                await OrderItem.findByIdAndRemove(orderItem);
            })
            return res.status(200).json({ success: true, message: "Đã xóa sản phẩm trong giỏ hàng" });
        } else {
            return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm trong giỏ hàng" })
        }
    }).catch(err => {
        return res.status(500).json({ success: false, error: err });
    });
});

// get total sales
router.get('/get/totalsales', async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } }
    ]);

    if (!totalSales) {
        return res.status(400).json({ success: false, message: "Không thể tạo đơn hàng" })
    }

    res.send({ totalSales: totalSales.pop().totalsales })
});

// get order count
router.get(`/get/count`, async (req, res) => {
    const orderCount = await Order.countDocuments((count) => count);

    if (orderCount) {
        return res.status(200).json({ success: true, message: "Lấy số lượng đơn hàng thành công!", data: orderCount });
    } else {
        return res.status(500).json({ success: false, message: "Không có đơn hàng!" });
    }
})

module.exports = router;