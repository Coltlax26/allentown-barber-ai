import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;

// Default barber (Richy)
const DEFAULT_TEAM_MEMBER_ID = "TMzW-_CKTJ98MP62";

// Use a recent Square-Version (keep consistent)
const SQUARE_VERSION = "2023-10-18";

function requireEnv(name, value) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
}

app.get("/", (req, res) => {
  res.send("Allentown Barber Studio Booking Server Running ✅");
});

app.post("/book-appointment", async (req, res) => {
  try {
    requireEnv("SQUARE_ACCESS_TOKEN", SQUARE_ACCESS_TOKEN);
    requireEnv("SQUARE_LOCATION_ID", SQUARE_LOCATION_ID);

    const { customerName, customerPhone, startAt, serviceVariationId } = req.body;

    if (!customerName || !customerPhone || !startAt || !serviceVariationId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: customerName, customerPhone, startAt, serviceVariationId"
      });
    }

    // 1) Create customer in Square
    const customerResponse = await fetch("https://connect.squareup.com/v2/customers", {
      method: "POST",
      headers: {
        "Square-Version": SQUARE_VERSION,
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        given_name: customerName,
        phone_number: customerPhone
      })
    });

    const customerData = await customerResponse.json();

    if (!customerResponse.ok) {
      return res.status(502).json({
        success: false,
        message: "Square customer create failed",
        squareError: customerData
      });
    }

    const customerId = customerData?.customer?.id;

    // 2) Create booking in Square (assign to Richy)
    const bookingResponse = await fetch("https://connect.squareup.com/v2/bookings", {
      method: "POST",
      headers: {
        "Square-Version": SQUARE_VERSION,
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        booking: {
          location_id: SQUARE_LOCATION_ID,
          start_at: startAt,
          customer_id: customerId,
          appointment_segments: [
            {
              team_member_id: DEFAULT_TEAM_MEMBER_ID,
              service_variation_id: serviceVariationId,
              duration_minutes: 30
            }
          ]
        }
      })
    });

    const bookingData = await bookingResponse.json();

    if (!bookingResponse.ok) {
      return res.status(502).json({
        success: false,
        message: "Square booking create failed",
        squareError: bookingData
      });
    }

    return res.json({
      success: true,
      message: "Appointment booked successfully.",
      booking: bookingData
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Booking failed.",
      error: String(error?.message || error)
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
