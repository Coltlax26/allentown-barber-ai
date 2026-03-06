import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;

// Default barber (Richy)
const DEFAULT_TEAM_MEMBER_ID = "TMzW-_CKTJ98MP62";
const SQUARE_VERSION = "2023-10-18";

app.get("/", (req, res) => {
  res.send("Allentown Barber Studio Booking Server Running ✅");
});

app.post("/book-appointment", async (req, res) => {
  try {
    // ✅ Extract arguments from Vapi tool call
    const toolCall =
      req.body?.message?.toolCallList?.[0] ||
      req.body?.message?.toolCalls?.[0];

    if (!toolCall || !toolCall.arguments) {
      console.error("❌ No tool arguments received:", req.body);
      return res.status(400).json({
        success: false,
        message: "No booking arguments received"
      });
    }

    const {
      customerName,
      customerPhone,
      startAt,
      serviceVariationId
    } = toolCall.arguments;

    console.log("📩 Booking arguments:", {
      customerName,
      customerPhone,
      startAt,
      serviceVariationId
    });

    if (!customerName || !customerPhone || !startAt || !serviceVariationId) {
      return res.status(400).json({
        success: false,
        message: "Missing required booking fields"
      });
    }

    // ✅ Create customer
    const customerResponse = await fetch("https://connect.squareup.com/v2/customers", {
      method: "POST",
      headers: {
        "Square-Version": SQUARE_VERSION,
        Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        given_name: customerName,
        phone_number: customerPhone
      })
    });

    const customerData = await customerResponse.json();

    if (!customerResponse.ok) {
      console.error("❌ Square customer error:", customerData);
      return res.status(502).json({ success: false });
    }

    const customerId = customerData.customer.id;

    // ✅ Create booking (assigned to Richy)
    const bookingResponse = await fetch("https://connect.squareup.com/v2/bookings", {
      method: "POST",
      headers: {
        "Square-Version": SQUARE_VERSION,
        Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
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
      console.error("❌ Square booking error:", bookingData);
      return res.status(502).json({ success: false });
    }

    console.log("✅ Booking confirmed:", bookingData);

    return res.json({
      success: true,
      message: "Appointment booked successfully"
    });

  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ success: false });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
