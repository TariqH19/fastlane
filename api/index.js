const express = require("express");
require("./api/configs/db.js")();
const fetch = require("node-fetch");
require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const port = 3333;

let PAYPAL_CLIENT = process.env.PAYPAL_CLIENT;
let PAYPAL_SECRET = process.env.PAYPAL_SECRET;
let FASTLANE_APPROVED_DOMAINS_CSV = process.env.FASTLANE_APPROVED_DOMAINS_CSV;
let PAYPAL_API_BASE_URL = "https://api-m.sandbox.paypal.com";

const app = express();
app.use(cors());
const clientPath = path.join(__dirname, "./client");
app.use(express.static(clientPath));
// app.set("view engine", "ejs");
// app.set("views", "./public");

app.use(express.json());

app.post("/api", async (req, res) => {
  let request_body = req.body;
  console.log("Received request:", request_body);

  switch (request_body.method) {
    case "fastlane_auth":
      return handle_fastlane_auth(res);
    case "auth":
      return handle_auth(res);
    case "card_order":
      return handle_card_order(request_body, res);
    case "create_order":
      return handle_create_order(request_body, res);
    case "complete_order":
      return handle_complete_order(request_body, res);
    default:
      console.error("Invalid method:", request_body.method);
      return res.status(400).json("Invalid endpoint");
  }
});

const handle_auth = async (res) => {
  try {
    res.status(200).json({ client_id: PAYPAL_CLIENT });
  } catch (error) {
    console.error("Error in handle_auth:", error);
    res.status(500).json(error.toString());
  }
};

const handle_fastlane_auth = async (res) => {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString(
      "base64"
    );

    const fastlane_auth_response = await fetch(
      `${PAYPAL_API_BASE_URL}/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          response_type: "client_token",
          intent: "sdk_init",
          "domains[]": FASTLANE_APPROVED_DOMAINS_CSV, // e.g., "yourdomain.com"
        }),
      }
    );

    // console.log(fastlane_auth_response);
    const data = await fastlane_auth_response.json();

    // if (!data.client_token) {
    //   throw new Error("Missing client_token in PayPal response");
    // }

    res.status(200).json({
      client_token: data,
    });
  } catch (error) {
    console.error("Error in handle_fastlane_auth:", error);
    res.status(500).json({ error: error.toString() });
  }
};

const handle_card_order = async (request_body, res) => {
  try {
    let { amount, payment_source, single_use_token, shipping_address } =
      request_body;
    let create_order_response = await create_order({
      amount,
      payment_source,
      single_use_token,
      shipping_address,
    });

    res.status(200).json(create_order_response);
  } catch (error) {
    console.error("Error in handle_card_order:", error);
    res.status(500).json(error.toString());
  }
};

const handle_create_order = async (request_body, res) => {
  try {
    let { amount, payment_source, shipping_address } = request_body;
    let create_order_request = await create_order({
      amount,
      payment_source,
      shipping_address,
    });

    res.status(200).json(create_order_request);
  } catch (error) {
    console.error("Error in handle_create_order:", error);
    res.status(500).json(error.toString());
  }
};

const handle_complete_order = async (request_body, res) => {
  try {
    let capture_paypal_order_response = await capture_paypal_order(
      request_body.order_id
    );
    res.status(200).json(capture_paypal_order_response);
  } catch (error) {
    console.error("Error in handle_complete_order:", error);
    res.status(500).json(error.toString());
  }
};

const capture_paypal_order = async (order_id) => {
  try {
    let access_token_response = await get_access_token();
    let access_token = access_token_response.access_token;
    let url = `${PAYPAL_API_BASE_URL}/v2/checkout/orders/${order_id}/capture`;

    let capture_request = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: "{}",
    });
    let capture_response = await capture_request.json();
    let sanitized_paypal_capture_response = {
      amount: {
        value:
          capture_response.purchase_units[0].payments.captures[0].amount.value,
        currency:
          capture_response.purchase_units[0].payments.captures[0].amount
            .currency_code,
      },
      payment_method: {},
    };
    if (capture_response.payment_source.paypal) {
      sanitized_paypal_capture_response.payment_method.type = "paypal";
      sanitized_paypal_capture_response.payment_method.details = {
        email: capture_response.payment_source.paypal.email_address,
      };
    }
    if (capture_response.payment_source.venmo) {
      sanitized_paypal_capture_response.payment_method.type = "venmo";
      sanitized_paypal_capture_response.payment_method.details = {
        email: capture_response.payment_source.venmo.email_address,
      };
    }
    console.log(
      "Capture Order Response:",
      JSON.stringify(capture_response, null, 2)
    );
    return sanitized_paypal_capture_response;
  } catch (error) {
    console.error("Error in capture_paypal_order:", error);
    throw error;
  }
};

const create_order = async (request_object) => {
  try {
    const { amount, payment_source, single_use_token, shipping_address } =
      request_object;
    const access_token_response = await get_access_token();
    const access_token = access_token_response.access_token;
    const create_order_endpoint = `${PAYPAL_API_BASE_URL}/v2/checkout/orders`;

    let purchase_unit_object = {
      amount: {
        currency_code: "GBP",
        value: amount,
        breakdown: {
          item_total: {
            currency_code: "GBP",
            value: amount,
          },
        },
      },
      items: [
        {
          name: "Buy Me",
          quantity: "1",
          category: shipping_address ? "PHYSICAL_GOODS" : "DIGITAL_GOODS",
          unit_amount: {
            currency_code: "GBP",
            value: amount,
          },
        },
      ],
    };

    if (shipping_address) {
      purchase_unit_object.shipping = {
        options: [
          {
            id: "my_custom_shipping_option_1",
            label: "Free Shipping",
            type: "SHIPPING",
            selected: true,
            amount: {
              currency_code: "GBP",
              value: "0.00",
            },
          },
        ],
        name: {
          full_name: "John Doe",
        },
        address: shipping_address,
      };
    }

    const payload = {
      intent: "CAPTURE",
      purchase_units: [purchase_unit_object],
      payment_source: {},
    };

    payload.payment_source[payment_source] = {
      experience_context: {
        brand_name: "BUY ME",
        shipping_preference: shipping_address ? "GET_FROM_FILE" : "NO_SHIPPING",
        user_action: "PAY_NOW",
        payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
      },
    };

    if (payment_source === "card") {
      purchase_unit_object.soft_descriptor = "BIZNAME HERE";
      payload.payment_source.card = {
        single_use_token: single_use_token,
        attributes: {
          verification: {
            method: "SCA_ALWAYS",
          },
        },
      };
    }

    console.log(
      "Payload before creating Order:",
      JSON.stringify(payload, null, 2)
    );

    const create_order_request = await fetch(create_order_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
        "PayPal-Request-Id": Math.random().toString(),
      },
      body: JSON.stringify(payload),
    });

    const json_response = await create_order_request.json();
    console.log("Order API Response:", JSON.stringify(json_response, null, 2));

    // Handle card payments
    if (payment_source === "card") {
      const capture =
        json_response?.purchase_units?.[0]?.payments?.captures?.[0];
      const card = capture?.payment_source?.card;

      // if (!capture) {
      //   throw new Error("Payment capture missing from PayPal response");
      // }

      const sanitized_card_capture_response = {
        // amount: {
        //   value: capture.amount?.value || amount,
        //   currency: capture.amount?.currency_code || "GBP",
        // },
        payment_method: {
          // type: "card",
          details: {
            name: card?.name || "Cardholder",
            last_digits: card?.last_digits || "****",
            brand: card?.brand || "Unknown",
            billing_address: card?.billing_address || null,
          },
        },
      };

      return sanitized_card_capture_response;
    }

    // Handle non-card payments (e.g., PayPal or Venmo, which require capture later)
    return json_response;
  } catch (error) {
    console.error("Error in create_order:", error);
    throw new Error(`Failed to create PayPal order: ${error.message}`);
  }
};

const get_access_token = async () => {
  let auth = Buffer.from(PAYPAL_CLIENT + ":" + PAYPAL_SECRET).toString(
    "base64"
  );
  let auth_request = await fetch(`${PAYPAL_API_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  let auth_response = await auth_request.json();
  return auth_response;
};

app.get("/", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

mongoose.connect(process.env.DB_ATLAS_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the schema and model for "Custom"
const customSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

const Custom = mongoose.model("Custom", customSchema);

const cartSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);

const emailSchema = new mongoose.Schema(
  {
    merchant: {
      type: String,
      required: true,
    },
    engineer: {
      type: String,
    },
  },
  { timestamps: true }
);

const Email = mongoose.model("Email", emailSchema);

app.get("/api/customs", async (req, res) => {
  try {
    const data = await Custom.find({});
    if (data.length > 0) {
      res.status(200).json(data);
    } else {
      res.status(404).json("None Found");
    }
  } catch (err) {
    console.error(`Error getting all Customs: ${err}`);
    res.status(500).json(err);
  }
});

// Endpoint to create data
app.post("/api/customs", async (req, res) => {
  try {
    const inputData = req.body;
    const data = await Custom.create(inputData);
    console.log("New Custom created");
    res.status(201).json(data);
  } catch (err) {
    if (err.name === "ValidationError") {
      res.status(422).json(err);
    } else {
      console.error(err);
      res.status(500).json(err);
    }
  }
});

app.get("/api/carts", async (req, res) => {
  try {
    const data = await Cart.find({});
    if (data.length > 0) {
      res.status(200).json(data);
    } else {
      res.status(404).json("None Found");
    }
  } catch (err) {
    console.error(`Error getting all carts: ${err}`);
    res.status(500).json(err);
  }
});

// Endpoint to create data
app.post("/api/carts", async (req, res) => {
  try {
    const inputData = req.body;
    const data = await Cart.create(inputData);
    console.log("New Cart created");
    res.status(201).json(data);
  } catch (err) {
    if (err.name === "ValidationError") {
      res.status(422).json(err);
    } else {
      console.error(err);
      res.status(500).json(err);
    }
  }
});

app.post("/api/emails", async (req, res) => {
  try {
    const inputData = req.body;
    const data = await Email.create(inputData);
    console.log("New Email created");
    res.status(201).json(data);
  } catch (err) {
    if (err.name === "ValidationError") {
      res.status(422).json(err);
    } else {
      console.error(err);
      res.status(500).json(err);
    }
  }
});

app.get("/api/emails", async (req, res) => {
  try {
    const data = await Email.find({});
    if (data.length > 0) {
      res.status(200).json(data);
    } else {
      res.status(404).json("None Found");
    }
  } catch (err) {
    console.error(`Error getting all emails: ${err}`);
    res.status(500).json(err);
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
