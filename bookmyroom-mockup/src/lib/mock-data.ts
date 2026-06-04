export interface Room {
  _id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  capacity: number;
  amenities: string[];
  images: string[];
  ownerName: string;
  isAvailable: boolean;
}

export interface Booking {
  _id: string;
  roomId: string;
  roomTitle: string;
  roomImage: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentMethod: "esewa" | "cod";
  paymentStatus: "pending" | "paid";
}

const HOTEL = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";
const MODERN = "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80";
const VENUE = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80";
const PARTY = "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80";
const APARTMENT = "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80";
const VILLA = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";
const CABIN = "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80";
const COTTAGE = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80";

export const rooms: Room[] = [
  {
    _id: "r1",
    title: "Cosy 2BR Apartment in Thamel",
    description:
      "A warm and cosy two-bedroom apartment in the heart of Thamel. Walk to restaurants, cafes, and tourist hotspots. Perfect for couples or small families looking for an authentic Kathmandu experience.",
    location: "Thamel, Kathmandu",
    price: 3500,
    capacity: 4,
    amenities: ["Wi-Fi", "Kitchen", "Hot Water", "Heater", "Washing Machine", "Parking"],
    images: [APARTMENT, MODERN, HOTEL],
    ownerName: "Ram Bahadur Shrestha",
    isAvailable: true,
  },
  {
    _id: "r2",
    title: "Premium Party Hall in Lalitpur",
    description:
      "Spacious party hall ideal for weddings, birthdays and corporate gatherings. Equipped with sound system, stage lighting and a fully serviced kitchen. Capacity up to 200 guests.",
    location: "Pulchowk, Lalitpur",
    price: 15000,
    capacity: 200,
    amenities: ["Sound System", "Stage Lighting", "Kitchen", "Parking", "AC", "Generator"],
    images: [PARTY, VENUE, MODERN],
    ownerName: "Sunita Maharjan",
    isAvailable: true,
  },
  {
    _id: "r3",
    title: "Heritage Guest House in Bhaktapur",
    description:
      "Live like Newari royalty in this traditional brick-and-wood guest house. Hand-carved windows, courtyard views and authentic Newa cuisine on request.",
    location: "Durbar Square, Bhaktapur",
    price: 2800,
    capacity: 3,
    amenities: ["Wi-Fi", "Breakfast", "Hot Water", "Courtyard", "Cultural Tours"],
    images: [COTTAGE, HOTEL, CABIN],
    ownerName: "Krishna Prajapati",
    isAvailable: true,
  },
  {
    _id: "r4",
    title: "Modern Co-working Space in Baluwatar",
    description:
      "Bright, fast Wi-Fi co-working space with private meeting rooms, hot desks and unlimited coffee. Perfect for freelancers, remote teams and startups.",
    location: "Baluwatar, Kathmandu",
    price: 1500,
    capacity: 20,
    amenities: ["High-speed Wi-Fi", "Meeting Rooms", "Coffee Bar", "Printer", "AC", "Parking"],
    images: [MODERN, HOTEL, APARTMENT],
    ownerName: "Anjali Karki",
    isAvailable: true,
  },
  {
    _id: "r5",
    title: "Lakeside Villa with Mountain Views",
    description:
      "Stunning lakeside villa with uninterrupted views of Phewa Lake and the Annapurna range. Private garden, sun-deck and rooftop seating. A bucket-list stay.",
    location: "Lakeside, Pokhara",
    price: 12000,
    capacity: 8,
    amenities: ["Wi-Fi", "Pool", "Garden", "Lake View", "Parking", "BBQ", "Kitchen"],
    images: [VILLA, COTTAGE, HOTEL],
    ownerName: "Bishnu Gurung",
    isAvailable: true,
  },
  {
    _id: "r6",
    title: "Mountain Cabin Retreat in Nagarkot",
    description:
      "Wake up to a sunrise over the Himalayas. This cosy timber cabin sits on the Nagarkot ridge with wraparound balconies and a wood-burning fireplace.",
    location: "Nagarkot Ridge, Nagarkot",
    price: 4500,
    capacity: 5,
    amenities: ["Wi-Fi", "Fireplace", "Mountain View", "Breakfast", "Parking", "Heater"],
    images: [CABIN, COTTAGE, VILLA],
    ownerName: "Tek Bahadur Tamang",
    isAvailable: true,
  },
  {
    _id: "r7",
    title: "Luxury Suite at Boudha Boutique",
    description:
      "Boutique suite a five-minute walk from Boudhanath Stupa. Marble bathroom, king bed and a private balcony overlooking the monastery rooftops.",
    location: "Boudha, Kathmandu",
    price: 6500,
    capacity: 2,
    amenities: ["Wi-Fi", "AC", "Breakfast", "King Bed", "Balcony", "Mini Bar"],
    images: [HOTEL, MODERN, APARTMENT],
    ownerName: "Pemba Sherpa",
    isAvailable: false,
  },
  {
    _id: "r8",
    title: "Family Cottage near Begnas Lake",
    description:
      "Peaceful three-bedroom cottage surrounded by terraced fields, a short drive from Begnas Lake. Ideal for family getaways and weekend retreats.",
    location: "Begnas, Pokhara",
    price: 5500,
    capacity: 6,
    amenities: ["Wi-Fi", "Kitchen", "Garden", "Parking", "Hot Water", "BBQ"],
    images: [COTTAGE, VILLA, CABIN],
    ownerName: "Sita Adhikari",
    isAvailable: true,
  },
];

export const bookings: Booking[] = [
  {
    _id: "b1",
    roomId: "r1",
    roomTitle: "Cosy 2BR Apartment in Thamel",
    roomImage: APARTMENT,
    guestName: "Ram Bahadur",
    checkIn: "2026-06-12",
    checkOut: "2026-06-15",
    guests: 2,
    totalPrice: 10500,
    status: "confirmed",
    paymentMethod: "esewa",
    paymentStatus: "paid",
  },
  {
    _id: "b2",
    roomId: "r5",
    roomTitle: "Lakeside Villa with Mountain Views",
    roomImage: VILLA,
    guestName: "Ram Bahadur",
    checkIn: "2026-07-02",
    checkOut: "2026-07-05",
    guests: 6,
    totalPrice: 36000,
    status: "pending",
    paymentMethod: "cod",
    paymentStatus: "pending",
  },
  {
    _id: "b3",
    roomId: "r3",
    roomTitle: "Heritage Guest House in Bhaktapur",
    roomImage: COTTAGE,
    guestName: "Sushmita Rai",
    checkIn: "2026-06-20",
    checkOut: "2026-06-22",
    guests: 2,
    totalPrice: 5600,
    status: "confirmed",
    paymentMethod: "esewa",
    paymentStatus: "paid",
  },
  {
    _id: "b4",
    roomId: "r6",
    roomTitle: "Mountain Cabin Retreat in Nagarkot",
    roomImage: CABIN,
    guestName: "Ram Bahadur",
    checkIn: "2026-08-10",
    checkOut: "2026-08-12",
    guests: 4,
    totalPrice: 9000,
    status: "pending",
    paymentMethod: "esewa",
    paymentStatus: "pending",
  },
  {
    _id: "b5",
    roomId: "r2",
    roomTitle: "Premium Party Hall in Lalitpur",
    roomImage: PARTY,
    guestName: "Anita Thapa",
    checkIn: "2026-06-28",
    checkOut: "2026-06-29",
    guests: 150,
    totalPrice: 15000,
    status: "cancelled",
    paymentMethod: "cod",
    paymentStatus: "pending",
  },
  {
    _id: "b6",
    roomId: "r4",
    roomTitle: "Modern Co-working Space in Baluwatar",
    roomImage: MODERN,
    guestName: "Dipesh Khadka",
    checkIn: "2026-06-15",
    checkOut: "2026-06-16",
    guests: 8,
    totalPrice: 1500,
    status: "confirmed",
    paymentMethod: "esewa",
    paymentStatus: "paid",
  },
];

export const mockUser = {
  name: "Ram Bahadur",
  email: "ram@example.com",
  role: "user" as const,
};
