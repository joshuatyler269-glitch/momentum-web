const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// Business Configuration Rules
const MIN_ORDER = 6500;
const MAX_ORDER = 200000;
const MAX_HAGGLE_PERCENT = 10;

// Helper Functions
function validateOrder(amount) {
  if (amount < MIN_ORDER) {
    throw new Error("Minimum order is ₦6,500");
  }
  if (amount > MAX_ORDER) {
    throw new Error("Maximum order is ₦200,000");
  }
}

function calculatePayment(productType, total) {
  if (productType === "pre_order") {
    return {
      upfront: total,
      remaining: 0,
      deliveryDays: "10-14"
    };
  }

  if (productType === "in_stock") {
    return {
      upfront: total * 0.5,
      remaining: total * 0.5,
      deliveryDays: "On delivery"
    };
  }

  throw new Error("Invalid product type");
}

function validateHaggle(listedPrice, requestedPrice) {
  const discount = ((listedPrice - requestedPrice) / listedPrice) * 100;

  if (discount < 0 || discount > MAX_HAGGLE_PERCENT) {
    throw new Error("Haggle cannot exceed 10%");
  }

  return discount;
}

// Routes
app.get('/', (req, res) => {
  res.send('oversabijojo accessories API is running live!');
});

app.post('/api/checkout', (req, res) => {
  try {
    const { amount, productType } = req.body;
    validateOrder(amount);
    const paymentDetails = calculatePayment(productType, amount);
    res.json({ success: true, paymentDetails });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`oversabijojo server running on http://localhost:${PORT}`);
});

