import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;

app.post("/book-appointment", async (req, res) => {
  try {
    const { customerName, customerPhone, startAt, serviceVariationId } = req.body;

    // Create customer in Square
    const customerResponse = await fetch("https://connect.squareup.com/v2/customers", {
      method: "POST",
      headers: {
        "Square-Version": "2023-10-18",
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        given_name: customerName,
        phone_number: customerPhone
      })
    });

    const customerData = await customerResponse.json();
    const customerId = customerData.customer.id;

    // Create booking
    const bookingResponse = await fetch("https://connect.squareup.com/v2/bookings", {
      method: "POST",
      headers: {
        "Square-Version": "2023-10-18",
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        booking: {
          location_id: SQUARE_LOCATION_ID,
          start_at: startAt,
          appointment_segments: [
            {
              service_variation_id: serviceVariationId,
              duration_minutes: 30
            }
          ],
          customer_id: customerId
        }
      })
    });

    const bookingData = await bookingResponse.json();

    res.json({
      success: true,
      message: "Appointment booked successfully.",
      booking: bookingData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Booking failed." });
  }
});

app.get("/", (req, res) => {
  res.send("Allentown Barber Studio Booking Server Running ✅");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
