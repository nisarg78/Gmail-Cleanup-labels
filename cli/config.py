"""
config.py — Static data: label definitions and sender-to-label mappings.
Edit this file to customize your inbox organization rules.
"""

# ── LABEL DEFINITIONS ──────────────────────────────────────────────────────────
# Each label includes Gmail-valid hex colors (bg + text).
# Slash notation (e.g. "Finance/Receipts") creates nested Gmail labels.
LABELS: list[dict] = [
    {"name": "Finance",                           "bg": "#16a765", "text": "#ffffff"},
    {"name": "Finance/Receipts",                  "bg": "#16a765", "text": "#ffffff"},
    {"name": "Finance/Banking & Credit Cards",    "bg": "#0d7a4e", "text": "#ffffff"},
    {"name": "Finance/Transfers",                 "bg": "#89d3b2", "text": "#094228"},
    {"name": "Finance/Taxes & Government",        "bg": "#2da2bb", "text": "#ffffff"},
    {"name": "Finance/Crypto",                    "bg": "#a2dcc1", "text": "#094228"},
    {"name": "Shopping",                          "bg": "#ff7537", "text": "#ffffff"},
    {"name": "Shopping/Receipts",                 "bg": "#ffad47", "text": "#3d1c00"},
    {"name": "Shopping/Promotions",               "bg": "#ffc8af", "text": "#5b2800"},
    {"name": "Jobs & Career",                     "bg": "#4986e7", "text": "#ffffff"},
    {"name": "Jobs & Career/Job Alerts",          "bg": "#4986e7", "text": "#ffffff"},
    {"name": "Jobs & Career/Recruiters",          "bg": "#3d6bbf", "text": "#ffffff"},
    {"name": "Jobs & Career/Applications",        "bg": "#7baef8", "text": "#0d1f44"},
    {"name": "Jobs & Career/Training",            "bg": "#c9daf8", "text": "#0d1f44"},
    {"name": "Travel & Transit",                  "bg": "#2da2bb", "text": "#ffffff"},
    {"name": "Travel & Transit/Flights & Hotels", "bg": "#2da2bb", "text": "#ffffff"},
    {"name": "Travel & Transit/Transit Receipts", "bg": "#7bd3eb", "text": "#0d2730"},
    {"name": "Accounts & Security",               "bg": "#cc3a21", "text": "#ffffff"},
    {"name": "Education",                         "bg": "#f2b600", "text": "#1a1400"},
    {"name": "Events & Communities",              "bg": "#a479e2", "text": "#ffffff"},
    {"name": "Newsletters",                       "bg": "#999999", "text": "#ffffff"},
    {"name": "Loyalty & Rewards",                 "bg": "#f691b2", "text": "#460016"},
    {"name": "Food Delivery",                     "bg": "#fb4c2f", "text": "#ffffff"},
    {"name": "Auctions",                          "bg": "#ffad47", "text": "#3d1c00"},
    {"name": "To Review",                         "bg": "#fbe983", "text": "#1a1400"},
    {"name": "Unsubscribe Candidates",            "bg": "#e07158", "text": "#ffffff"},
]

# ── SENDER → LABEL MAPPINGS ────────────────────────────────────────────────────
# Add or remove entries here. The "email" field is used as the Gmail `from:` filter.
# "label" must exactly match a name defined in LABELS above (or a valid Gmail label).
SENDERS: list[dict] = [
    # ── Finance ──────────────────────────────────────────────────────────────
    {"name": "American Express",       "email": "americanexpress@welcome.americanexpress.com", "label": "Finance/Banking & Credit Cards"},
    {"name": "Apple",                  "email": "no_reply@email.apple.com",                    "label": "Finance/Receipts"},
    {"name": "CRA",                    "email": "do_not_reply-ne_pas_repondre@cra-arc.gc.ca",  "label": "Finance/Taxes & Government"},
    {"name": "Interac e-Transfer",     "email": "catch@payments.interac.ca",                   "label": "Finance/Transfers"},
    {"name": "Interac Notify",         "email": "notify@payments.interac.ca",                  "label": "Finance/Transfers"},
    {"name": "PC Financial",           "email": "info@e.pcfinancial.ca",                       "label": "Finance/Banking & Credit Cards"},
    {"name": "Anthropic Invoices",     "email": "invoice+statements@mail.anthropic.com",       "label": "Finance/Receipts"},
    {"name": "GTPL Broadband",         "email": "noreply@gtpl.net",                            "label": "Finance/Receipts"},
    {"name": "WazirX Crypto",          "email": "noreply@wazirx.com",                         "label": "Finance/Crypto"},

    # ── Shopping ─────────────────────────────────────────────────────────────
    {"name": "Canada's Wonderland",    "email": "noreply@accessoticketing.com",                "label": "Shopping/Receipts"},
    {"name": "IKEA Receipts",          "email": "no.reply@ikea.com",                           "label": "Shopping/Receipts"},
    {"name": "New Balance",            "email": "newbalance@receipts.newbalance.com",           "label": "Shopping/Receipts"},
    {"name": "Walmart Receipts",       "email": "noreply@walmart.ca",                          "label": "Shopping/Receipts"},

    # ── Jobs & Career ─────────────────────────────────────────────────────────
    {"name": "Deloitte Careers",       "email": "noreply@deloitte.ca",                         "label": "Jobs & Career/Applications"},
    {"name": "LinkedIn InMail",        "email": "hit-reply@linkedin.com",                      "label": "Jobs & Career/Recruiters"},
    {"name": "LinkedIn InMail Direct", "email": "inmail-hit-reply@linkedin.com",               "label": "Jobs & Career/Recruiters"},
    {"name": "Randstad Canada",        "email": "noreply@randstad.ca",                         "label": "Jobs & Career/Job Alerts"},

    # ── Travel & Transit ──────────────────────────────────────────────────────
    {"name": "Air Canada Aeroplan",    "email": "communications@mail.aircanada.com",           "label": "Travel & Transit/Flights & Hotels"},
    {"name": "NJ Transit MyTix",       "email": "noreply@mytix.njtransit.com",                 "label": "Travel & Transit/Transit Receipts"},
    {"name": "PRESTO Card",            "email": "prestomailer@prestocard.ca",                  "label": "Travel & Transit/Transit Receipts"},
    {"name": "Trip.com",               "email": "en_flight@trip.com",                          "label": "Travel & Transit/Flights & Hotels"},

    # ── Accounts & Security ───────────────────────────────────────────────────
    {"name": "Google Security",        "email": "no-reply@accounts.google.com",                "label": "Accounts & Security"},
    {"name": "Google Privacy",         "email": "google-noreply@google.com",                   "label": "Accounts & Security"},

    # ── Education ─────────────────────────────────────────────────────────────
    {"name": "WES",                    "email": "autonotification@wes.org",                    "label": "Education"},
    {"name": "Kaggle",                 "email": "no-reply@kaggle.com",                         "label": "Education"},

    # ── Events & Communities ──────────────────────────────────────────────────
    {"name": "Tech Pizza Monday",      "email": "techpizzamonday@user.luma-mail.com",          "label": "Events & Communities"},
    {"name": "Microsoft Events",       "email": "replyto@email.microsoft.com",                 "label": "Events & Communities"},
    {"name": "Microsoft Reactor",      "email": "reactor@microsoft.com",                       "label": "Events & Communities"},

    # ── Loyalty & Rewards ─────────────────────────────────────────────────────
    {"name": "PC Optimum",             "email": "noreply@em.pcoptimum.ca",                     "label": "Loyalty & Rewards"},
    {"name": "Scene+",                 "email": "news@news.sceneplus.ca",                      "label": "Loyalty & Rewards"},
    {"name": "Shoppers Be Well",       "email": "communications@sf.letsbewell.ca",             "label": "Loyalty & Rewards"},

    # ── Food Delivery ─────────────────────────────────────────────────────────
    {"name": "DoorDash",               "email": "no-reply@messages.doordash.com",              "label": "Food Delivery"},
    {"name": "DoorDash (2)",           "email": "no-reply@doordash.com",                       "label": "Food Delivery"},
    {"name": "Subway",                 "email": "account@email.subway.com",                    "label": "Food Delivery"},
    {"name": "Uber Eats",              "email": "noreply@uber.com",                            "label": "Food Delivery"},

    # ── Newsletters ───────────────────────────────────────────────────────────
    {"name": "Toronto Tech Week",      "email": "torontotechweeksignup@mail.beehiiv.com",      "label": "Newsletters"},

    # ── Auctions ──────────────────────────────────────────────────────────────
    {"name": "Auction Mongers",        "email": "noreply@auctionmongers.com",                  "label": "Auctions"},

    # ── To Review (ambiguous / decide manually) ───────────────────────────────
    {"name": "McMaster Cont. Ed.",     "email": "mce@mcmaster.ca",                             "label": "To Review"},
    {"name": "Reliance Digital",       "email": "mail@mail.reliancedigital.in",                "label": "To Review"},
    {"name": "TCS iON",                "email": "info.tcsionhub@tcsion.com",                  "label": "To Review"},
    {"name": "Uber Eats Promos",       "email": "ubereats@uber.com",                          "label": "To Review"},
    {"name": "Futurist/EmeraldEex",    "email": "futurist@emeraldeex.com",                    "label": "To Review"},

    # ── Unsubscribe Candidates ────────────────────────────────────────────────
    {"name": "Calvin Klein",           "email": "calvinklein@em.calvinklein.com",              "label": "Unsubscribe Candidates"},
    {"name": "Chess.com",              "email": "hello@chess.com",                             "label": "Unsubscribe Candidates"},
    {"name": "Glassdoor",              "email": "noreply@glassdoor.com",                       "label": "Unsubscribe Candidates"},
    {"name": "HiBid Auctions",         "email": "newsletter@auctions.hibid.com",               "label": "Unsubscribe Candidates"},
    {"name": "HiBid Mailing",          "email": "newsletter@mailing.hibid.com",               "label": "Unsubscribe Candidates"},
    {"name": "IKEA Newsletter",        "email": "ikea@news.email.ikea.ca",                    "label": "Unsubscribe Candidates"},
    {"name": "Indeed Job Alerts",      "email": "donotreply@jobalert.indeed.com",              "label": "Unsubscribe Candidates"},
    {"name": "Indeed Match",           "email": "donotreply@match.indeed.com",                "label": "Unsubscribe Candidates"},
    {"name": "LinkedIn Job Alerts",    "email": "jobalerts-noreply@linkedin.com",              "label": "Unsubscribe Candidates"},
    {"name": "LinkedIn Jobs",          "email": "jobs-noreply@linkedin.com",                  "label": "Unsubscribe Candidates"},
    {"name": "LinkedIn News",          "email": "editors-noreply@linkedin.com",               "label": "Unsubscribe Candidates"},
    {"name": "LinkedIn Newsletters",   "email": "newsletters-noreply@linkedin.com",           "label": "Unsubscribe Candidates"},
    {"name": "Porter Airlines",        "email": "flyporter@communications.flyporter.com",     "label": "Unsubscribe Candidates"},
    {"name": "Reitmans / RW&Co",       "email": "email@email.rw-co.com",                      "label": "Unsubscribe Candidates"},
    {"name": "Tim Hortons",            "email": "promo@promo.timhortons.ca",                  "label": "Unsubscribe Candidates"},
    {"name": "Uber Marketing",         "email": "uber@uber.com",                              "label": "Unsubscribe Candidates"},
    {"name": "UNIQLO",                 "email": "newsletter@enews.uniqlo.ca",                 "label": "Unsubscribe Candidates"},
    {"name": "Walmart Promos",         "email": "offers@e.walmart.ca",                        "label": "Unsubscribe Candidates"},
]

# ── RUNTIME SETTINGS ───────────────────────────────────────────────────────────
BATCH_SIZE: int = 4          # Items per API call (labels and senders)
LABEL_TIMEOUT: int = 90      # Seconds before a label-creation batch is aborted
SENDER_TIMEOUT: int = 120    # Seconds before a sender-labeling batch is aborted
SWEEP_TIMEOUT: int = 120     # Seconds for the discovery sweep call
MODEL: str = "claude-sonnet-4-20250514"
MAX_TOKENS: int = 4000
GMAIL_MCP_URL: str = "https://gmailmcp.googleapis.com/mcp/v1"
