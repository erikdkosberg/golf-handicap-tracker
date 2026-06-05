import datetime
import email

from bs4 import BeautifulSoup


def extract_total_from_header_row_soup(soup, label):
    """
    Find the total (last <b>) in the header row for the given label using an existing BeautifulSoup object.
    """
    header_spans = soup.find_all(
        "span", string=lambda s: s and label.lower() in s.lower()
    )
    for span in header_spans:
        tr = span.find_parent("tr")
        if not tr:
            continue
        b_tags = tr.find_all("b")
        if b_tags:
            total = b_tags[-1].text.strip()
            if total.isdigit():
                return int(total)
    return None


def extract_all_scores_for_player(soup, player_name):
    """
    Return a list of all scores (per-hole, OUT, IN, TOTAL) for the given player.
    """
    player_spans = soup.find_all(
        "span", string=lambda s: s and player_name.lower() in s.lower()
    )
    for span in player_spans:
        tr = span.find_parent("tr")
        if not tr:
            continue
        b_tags = tr.find_all("b")
        scores = []
        for i, b in enumerate(b_tags):
            val = b.text.strip()

            if i == 9 or i == 19 or i == 20:
                continue

            try:
                scores.append(int(val))
            except ValueError:
                scores.append(val)

        return scores
    return []


def extract_pars_from_soup(soup):
    """
    Parse the 'Par' row from a Golfshot email table and return a list of par values (per hole).
    """
    for tr in soup.find_all("tr"):
        span = tr.find("span", string=lambda s: s and s.strip().lower() == "par")
        if span:
            tds = tr.find_all("td")
            values = []
            for td in tds:
                text = td.get_text(strip=True)
                if text.lower() in {"par", "out", "in", "total"}:
                    continue
                try:
                    num = int(text)
                    if num in (3, 4, 5):
                        values.append(num)
                except ValueError:
                    continue
            if len(values) in (9, 18):
                return values
    return []


def parse_golfshot_email(eml_bytes, player_name):
    msg = email.message_from_bytes(eml_bytes)
    html = None
    for part in msg.walk():
        if part.get_content_type() == "text/html":
            html = part.get_payload(decode=True)
            break
    if not html:
        return None
    soup = BeautifulSoup(html, "lxml")
    try:
        info_cells = soup.find_all("td", {"valign": "top", "height": "25"})
        course_name = (
            info_cells[1].get_text(strip=True) if len(info_cells) > 1 else None
        )
        tees = info_cells[3].get_text(strip=True) if len(info_cells) > 3 else None
        course_info = tees.split(",")[0].split("-")
        tees = course_info[0].split()[0]
        course_rating = float(course_info[1].replace(" ", "").split("/")[0])
        course_slope = int(course_info[1].replace(" ", "").split("/")[1])
        date_and_location = (
            info_cells[4].get_text(strip=True) if len(info_cells) > 4 else None
        )
        date_part = (
            date_and_location.split(",")[0] + "," + date_and_location.split(",")[1]
        )

        yardage = extract_total_from_header_row_soup(soup, "Distance")
        score = extract_total_from_header_row_soup(soup, player_name)
        par = extract_total_from_header_row_soup(soup, "Par")
        hole_scores = extract_all_scores_for_player(soup, player_name)

        if len(hole_scores) == 11:
            hole_scores = hole_scores[:9]

        hole_scores_int = [score for score in hole_scores if isinstance(score, int)]

        pars = extract_pars_from_soup(soup)

        hole_scores_json = {}

        for i in range(len(hole_scores)):
            hole_scores_json[f"hole_{i + 1}"] = {
                "score": hole_scores_int[i] if i < len(hole_scores_int) else None,
                "par": pars[i] if i < len(pars) else None,
                "net": hole_scores_int[i] - pars[i] if i < len(pars) else None,
            }

        if len(hole_scores_int) not in [9, 18]:
            print("Skipping round: Not enough holes played")
            return None

        if len(hole_scores) != len(hole_scores_int):
            course_rating = None
            course_slope = None

        dt = datetime.datetime.strptime(date_part.strip(), "%B %d, %Y")

        return {
            "date": dt,
            "score": score,
            "course_rating": course_rating,
            "course_slope": course_slope,
            "course": course_name,
            "tees": tees,
            "yardage": yardage,
            "par": par,
            "hole_count": len(hole_scores_int),
            "hole_scores": hole_scores_json,
        }
    except Exception as e:
        print("Parse error:", e)
        return None
