import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;

// ✅ Default barber (Richy)
const DEFAULT_TEAM_MEMBER_ID = "TMzW-_CKTJ98MP62";

// ✅ Keep version consistent
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
      console.error("❌ Missing required fields:", req.body);
      return res.status(400).json({
        success: false,
        message: "Missing required fields."
      });
    }

    console.log("📩 Incoming booking request:", req.body);

    // ✅ 1) Create customer
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
      console.error("❌ Square customer error:", JSON.stringify(customerData, null, 2));
      return res.status(502).json({
        success: false,
        message: "Customer creation failed",
        squareError: customerData
      });
    }

    const customerId = customerData?.customer?.id;
    console.log("✅ Customer created:", customerId);

    // ✅ 2) Create booking (assigned to Richy)
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
      console.error("❌ Square booking error:", JSON.stringify(bookingData, null, 2));
      return res.status(502).json({
        success: false,
        message: "Booking failed",
        squareError: bookingData
      });
    }

    console.log("✅ Booking successful:", bookingData);

    return res.json({
      success: true,
      message: "Appointment booked successfully.",
      booking: bookingData
    });

  } catch (error) {
    console.error("❌ Server crash:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: String(error?.message || error)
    });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
