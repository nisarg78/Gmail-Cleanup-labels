export interface LabelDefinition {
  name: string
  bg: string
  text: string
}

export const LABELS: LabelDefinition[] = [
  // Finance (green)
  { name: "Finance", bg: "#16a765", text: "#ffffff" },
  { name: "Finance/Receipts", bg: "#16a765", text: "#ffffff" },
  { name: "Finance/Statements", bg: "#16a765", text: "#ffffff" },
  { name: "Finance/Investments", bg: "#16a765", text: "#ffffff" },
  // Shopping (orange)
  { name: "Shopping", bg: "#ff7537", text: "#ffffff" },
  { name: "Shopping/Orders", bg: "#ff7537", text: "#ffffff" },
  { name: "Shopping/Shipping", bg: "#ff7537", text: "#ffffff" },
  // Jobs & Career (blue)
  { name: "Jobs & Career", bg: "#4986e7", text: "#ffffff" },
  { name: "Jobs & Career/Recruiters", bg: "#4986e7", text: "#ffffff" },
  // Travel & Transit (teal)
  { name: "Travel & Transit", bg: "#2da2bb", text: "#ffffff" },
  { name: "Travel & Transit/Bookings", bg: "#2da2bb", text: "#ffffff" },
  // Accounts & Security (red)
  { name: "Accounts & Security", bg: "#cc3a21", text: "#ffffff" },
  { name: "Accounts & Security/Alerts", bg: "#cc3a21", text: "#ffffff" },
  // Education (yellow)
  { name: "Education", bg: "#f2a600", text: "#ffffff" },
  // Events & Communities (purple)
  { name: "Events & Communities", bg: "#a479e2", text: "#ffffff" },
  { name: "Events & Communities/Meetups", bg: "#a479e2", text: "#ffffff" },
  // Newsletters (grey)
  { name: "Newsletters", bg: "#8d8d8d", text: "#ffffff" },
  // Loyalty & Rewards (pink)
  { name: "Loyalty & Rewards", bg: "#f691b2", text: "#000000" },
  // Food Delivery (red-orange)
  { name: "Food Delivery", bg: "#fb4c2f", text: "#ffffff" },
  // Auctions (amber)
  { name: "Auctions", bg: "#ffad47", text: "#000000" },
  // To Review (light yellow)
  { name: "To Review", bg: "#fbe983", text: "#000000" },
  // Unsubscribe Candidates (salmon)
  { name: "Unsubscribe Candidates", bg: "#e07798", text: "#ffffff" },
  // Crypto (dark blue)
  { name: "Crypto", bg: "#1c4587", text: "#ffffff" },
  // Government & Legal (dark red)
  { name: "Government & Legal", bg: "#8a1c00", text: "#ffffff" },
  // Health & Medical (soft green)
  { name: "Health & Medical", bg: "#149e60", text: "#ffffff" },
  // Social Media
  { name: "Social Media", bg: "#653e9b", text: "#ffffff" },
]
