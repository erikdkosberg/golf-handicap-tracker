from bs4 import BeautifulSoup
import email
import datetime


def parse_golfshot_email(eml_bytes):
    msg = email.message_from_bytes(eml_bytes)
    html = None
    for part in msg.walk():
        if part.get_content_type() == "text/html":
            html = part.get_payload(decode=True)
            break
    if not html:
        return None
    soup = BeautifulSoup(html, "html.parser")
    # You will need to customize this to reliably extract:
    # - date, course, score, course_rating, course_slope, tees, yardage, par
    # Here's a simple sketch (you must adjust to real structure!):
    info_cells = soup.find_all("td", {"bgcolor": "#ffffff"})
    if not info_cells:
        return None
    try:
        player_name = info_cells[0].find("b").text.strip()
        course_name = info_cells[1].find("span").text.strip()
        tees_info = info_cells[3].find("span").text.strip()
        date_loc = info_cells[4].text.strip()
        # Find table with the "Par" row and user score row, extract as needed
        # ...
        # For demo, use placeholders:
        return {
            "date": datetime.date.today(),  # Parse from string above
            "score": 90,
            "course_rating": 71.2,
            "course_slope": 125,
            "course": course_name,
            "tees": "Blue",
            "yardage": 6359,
            "par": 72,
        }
    except Exception as e:
        print("Email parse error", e)
        return None
