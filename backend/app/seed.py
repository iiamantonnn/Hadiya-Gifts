"""Realistic demo data so the app is meaningful right after setup: a full
flower catalog, plus a demo account (pre-verified) with sample people,
important dates, and a wishlist item, so a first-time reviewer can log in
and see a populated dashboard immediately instead of an empty shell."""
from datetime import date, timedelta

from app.database import Base, engine, SessionLocal
from app import models
from app.security import hash_secret

FLOWERS = [
    dict(name="Classic Red Roses", description="A dozen long-stem red roses, the timeless romantic gesture.",
         price_cents=6500, images=["/photos/rose_red.jpg"], flower_type="roses", colors=["red"],
         sizes=["small", "medium", "large"], occasions=["romantic", "anniversary", "just_because"],
         recommended_relationships=["partner"], care_instructions="Re-cut stems at an angle before placing in water.",
         water_instructions="Change water every 2 days; keep the vase full.", stem_instructions="Remove leaves below the waterline.",
         placement_instructions="Keep away from direct sun and heating vents.", avoid_notes="Avoid placing near ripening fruit.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-7 days."),
    dict(name="White Rose Bouquet", description="Elegant white roses for moments that call for quiet grace.",
         price_cents=6000, images=["/photos/rose_white.jpg"], flower_type="roses", colors=["white"],
         sizes=["small", "medium", "large"], occasions=["sympathy", "congratulations", "thank_you"],
         recommended_relationships=["mother", "colleague", "friend"], care_instructions="Trim 1cm off stems every few days.",
         water_instructions="Use lukewarm water and flower food if provided.", stem_instructions="Cut at a 45-degree angle.",
         placement_instructions="Cool room, out of direct sunlight.", avoid_notes="Avoid drafty spots near doors.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-7 days."),
    dict(name="Pink Peony Bunch", description="Soft, full peonies in blush pink - a favorite for spring occasions.",
         price_cents=8500, images=["/photos/peony_pink.jpg"], flower_type="peonies", colors=["pink"],
         sizes=["medium", "large"], occasions=["birthday", "just_because", "thank_you"],
         recommended_relationships=["mother", "friend", "sibling"], care_instructions="Peonies open over 2-3 days once cut.",
         water_instructions="Keep water clean and change every other day.", stem_instructions="Re-cut stems on arrival.",
         placement_instructions="Cool spot, out of direct sun.", avoid_notes="Buds may be slightly sticky - this is normal.",
         estimated_lifespan_text="Estimated lifespan with proper care: 4-6 days."),
    dict(name="Sunshine Tulip Mix", description="A cheerful bunch of yellow and orange tulips.",
         price_cents=4200, images=["/photos/tulip_yellow.jpg"], flower_type="tulips", colors=["yellow"],
         sizes=["small", "medium"], occasions=["birthday", "congratulations", "friendship"],
         recommended_relationships=["friend", "colleague"], care_instructions="Tulips continue to grow slightly after cutting.",
         water_instructions="Use cold water; change every 2 days.", stem_instructions="Trim stems straight, not at an angle.",
         placement_instructions="Cooler rooms keep tulips upright longer.", avoid_notes="Keep away from direct heat.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-8 days."),
    dict(name="Purple Tulip Bunch", description="Rich purple tulips for a thoughtful, understated gift.",
         price_cents=4200, images=["/photos/tulip_purple.jpg"], flower_type="tulips", colors=["purple"],
         sizes=["small", "medium"], occasions=["thank_you", "just_because"],
         recommended_relationships=["friend", "grandparent"], care_instructions="Tulips continue to grow slightly after cutting.",
         water_instructions="Use cold water; change every 2 days.", stem_instructions="Trim stems straight, not at an angle.",
         placement_instructions="Cooler rooms keep tulips upright longer.", avoid_notes="Keep away from direct heat.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-8 days."),
    dict(name="White Lily Arrangement", description="Fragrant white lilies arranged with greenery.",
         price_cents=7200, images=["/photos/lily_white.jpg"], flower_type="lilies", colors=["white"],
         sizes=["medium", "large"], occasions=["sympathy", "congratulations"],
         recommended_relationships=["mother", "grandparent", "colleague"], care_instructions="Remove pollen-heavy stamens to prevent staining.",
         water_instructions="Change water every 2-3 days.", stem_instructions="Re-cut stems every few days.",
         placement_instructions="Bright room, indirect light.", avoid_notes="Pollen can stain fabric - handle carefully.",
         estimated_lifespan_text="Estimated lifespan with proper care: 6-10 days."),
    dict(name="Blue Hydrangea Bunch", description="Full, cloud-like blue hydrangea blooms.",
         price_cents=7800, images=["/photos/hydrangea_blue.jpg"], flower_type="mixed", colors=["blue"],
         sizes=["medium", "large"], occasions=["birthday", "just_because"],
         recommended_relationships=["mother", "friend"], care_instructions="Hydrangeas are thirsty - check water daily.",
         water_instructions="Top up water daily; mist petals lightly.", stem_instructions="Re-cut and split stem ends.",
         placement_instructions="Cool, humid spot away from direct sun.", avoid_notes="Wilts quickly if water runs low.",
         estimated_lifespan_text="Estimated lifespan with proper care: 4-6 days."),
    dict(name="Seasonal Wildflower Mix", description="A relaxed, garden-style mix of whatever's freshest this week.",
         price_cents=4800, images=["/photos/seasonal_mix.jpg"], flower_type="seasonal", colors=["mixed"],
         sizes=["small", "medium", "large"], occasions=["just_because", "friendship", "thank_you"],
         recommended_relationships=["friend", "colleague", "sibling"], care_instructions="Mixed stems - trim all evenly.",
         water_instructions="Change water every 2 days.", stem_instructions="Remove any leaves below the waterline.",
         placement_instructions="Bright, indirect light.", avoid_notes="Remove any wilting stems promptly to preserve the rest.",
         estimated_lifespan_text="Estimated lifespan with proper care: 4-7 days."),
    dict(name="Grand Mixed Celebration Bouquet", description="A generous, colorful arrangement for big moments.",
         price_cents=9500, images=["/photos/mixed_grand.jpg"], flower_type="mixed", colors=["mixed"],
         sizes=["large"], occasions=["congratulations", "birthday", "anniversary"],
         recommended_relationships=["partner", "mother", "friend"], care_instructions="Re-cut stems and change water every 2 days.",
         water_instructions="Keep the vase topped up.", stem_instructions="Remove lower leaves.",
         placement_instructions="Cool room, out of direct sun.", avoid_notes="Keep away from ripening fruit and heat sources.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-8 days."),
    dict(name="Pink Rose & Peony Duo", description="Pink roses and peonies paired for a soft, romantic look.",
         price_cents=8800, images=["/photos/rose_peony_duo.jpg"], flower_type="mixed", colors=["pink"],
         sizes=["medium", "large"], occasions=["romantic", "anniversary", "birthday"],
         recommended_relationships=["partner"], care_instructions="Re-cut stems before arranging.",
         water_instructions="Change water every 2 days.", stem_instructions="Remove leaves below the waterline.",
         placement_instructions="Cool spot, indirect light.", avoid_notes="Keep away from direct heat.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-7 days."),
    dict(name="Petite Daisy Posy", description="A small, friendly bunch of white daisies - simple and sincere.",
         price_cents=2800, images=["/photos/daisy_white.jpg"], flower_type="other", colors=["white"],
         sizes=["small"], occasions=["friendship", "just_because", "thank_you"],
         recommended_relationships=["friend", "colleague"], care_instructions="Trim stems and change water regularly.",
         water_instructions="Change water every 2 days.", stem_instructions="Cut at an angle.",
         placement_instructions="Bright, indirect light.", avoid_notes="Keep out of direct sun.",
         estimated_lifespan_text="Estimated lifespan with proper care: 4-6 days."),
    dict(name="Deep Purple Iris Bunch", description="Striking purple irises with a modern, architectural feel.",
         price_cents=5200, images=["/photos/iris_purple.jpg"], flower_type="other", colors=["purple"],
         sizes=["small", "medium"], occasions=["congratulations", "thank_you"],
         recommended_relationships=["colleague", "friend"], care_instructions="Irises open gradually after cutting.",
         water_instructions="Change water every 2 days.", stem_instructions="Re-cut stems at an angle.",
         placement_instructions="Cool room, indirect light.", avoid_notes="Handle petals gently - they bruise easily.",
         estimated_lifespan_text="Estimated lifespan with proper care: 4-6 days."),
]


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Flower).count() == 0:
            for data in FLOWERS:
                db.add(models.Flower(**data))
            db.commit()
            print(f"Seeded {len(FLOWERS)} flowers.")
        else:
            print("Flowers already seeded, skipping catalog.")

        seed_demo_persona(db)
    finally:
        db.close()


def seed_demo_persona(db):
    """The rich demo persona used for live walkthroughs: Alex Israelyan, with
    favorite people, upcoming dates, a wishlist, and both sent and received
    gift history so every tab of the app has something real to show. Guarded
    by an existence check so re-running seed.py is always safe."""
    today = date.today()

    alex = db.query(models.User).filter(models.User.email == "alex.israelyan@hadiya.demo").first()
    if alex:
        print("Demo persona already exists, skipping.")
        return

    flowers_by_name = {f.name: f for f in db.query(models.Flower).all()}

    alex = models.User(
        first_name="Alex", last_name="Israelyan", email="alex.israelyan@hadiya.demo",
        preferred_name="Alex", password_hash=hash_secret("HadiyaDemo123!"),
        email_verified=True,
    )
    db.add(alex)
    db.flush()

    anahit = models.Person(
        owner_id=alex.id, name="Anahit", relationship_type="sister",
        birthday=today + timedelta(days=18), favorite_flowers=["tulips", "peonies"],
        favorite_colors=["yellow", "pink"], is_favorite=True,
        notes="Just moved into a new apartment - loves bright, cheerful colors.",
    )
    anna = models.Person(
        owner_id=alex.id, name="Anna", relationship_type="mother",
        birthday=today + timedelta(days=6), favorite_flowers=["roses", "peonies"],
        favorite_colors=["white", "pink"], is_favorite=True,
        notes="Her favorite flowers are peonies and white roses. Loves quiet mornings with "
              "a good book, tending her garden, and anything lavender-scented.",
    )
    maria = models.Person(
        owner_id=alex.id, name="Maria", relationship_type="friend",
        birthday=today + timedelta(days=45), favorite_flowers=["lilies", "mixed"],
        favorite_colors=["white", "purple"], is_favorite=True,
    )
    db.add_all([anahit, anna, maria])
    db.flush()

    db.add(models.ImportantDate(
        person_id=anna.id, date_type="anniversary", occurs_on=today + timedelta(days=27),
        recurring=True, reminder_offsets_days=[7, 3, 1, 0],
    ))
    db.add(models.ImportantDate(
        person_id=maria.id, date_type="custom", custom_label="Important personal date",
        occurs_on=today + timedelta(days=12), recurring=False, reminder_offsets_days=[7, 3, 1, 0],
    ))

    alex_address = models.Address(
        user_id=alex.id, label="Home", line1="14 Northern Avenue, Apt 5B", city="Yerevan",
        region="Yerevan", postal_code="0001", country="Armenia", is_default=True,
    )
    db.add(alex_address)
    db.flush()

    vase = models.WishlistItem(
        owner_id=alex.id, person_id=anna.id, product_name="Ceramic Vase - Speckled White",
        marketplace="Etsy", url="https://www.etsy.com/listing/1023456789/ceramic-speckled-vase",
        color="White", material="Ceramic", image_url="/photos/product_vase.jpg",
        notes="Would look perfect with the peonies she loves.",
    )
    db.add_all([
        vase,
        models.WishlistItem(
            owner_id=alex.id, person_id=anahit.id, product_name="Scented Soy Candle - Vanilla Bergamot",
            marketplace="Etsy", url="https://www.etsy.com/listing/987654321/vanilla-bergamot-soy-candle",
            image_url="/photos/product_candle.jpg",
            notes="For the new apartment - she mentioned wanting something cozy.",
        ),
        models.WishlistItem(
            owner_id=alex.id, person_id=maria.id, product_name="Cozy Knit Throw Blanket",
            marketplace="Amazon", url="https://www.amazon.com/dp/B08X4KJQ2L",
            color="Grey", size="50x60in", material="Wool blend", image_url="/photos/product_blanket.jpg",
            notes="Perfect for her reading nook.",
        ),
        models.WishlistItem(
            owner_id=alex.id, person_id=None, product_name="Wireless Noise-Cancelling Headphones",
            marketplace="Amazon", url="https://www.amazon.com/dp/B0863TXGM3",
            model="WH-1000XM4", color="Black", image_url="/photos/product_headphones.jpg",
            notes="Been eyeing these for months.",
        ),
        models.WishlistItem(
            owner_id=alex.id, person_id=None, product_name="Leather Travel Journal - Refillable",
            marketplace="Etsy", url="https://www.etsy.com/listing/1145678901/leather-travel-journal",
            color="Brown", material="Leather", image_url="/photos/product_journal.jpg",
        ),
    ])
    db.flush()

    def _order_with_extras(*, buyer_id, recipient, flower_name, size, color, occasion,
                            delivery_date, status, window, address_id, message_text, wishlist_item_id=None):
        flower = flowers_by_name[flower_name]
        order = models.Order(
            buyer_id=buyer_id, recipient_person_id=recipient.id, flower_id=flower.id,
            size=size, color=color, occasion=occasion, delivery_date=delivery_date,
            delivery_window_start=window[0], delivery_window_end=window[1],
            address_id=address_id, is_anonymous=False, price_cents=flower.price_cents,
            status=status, wishlist_item_id=wishlist_item_id,
        )
        db.add(order)
        db.flush()
        db.add(models.GiftMessage(order_id=order.id, card_type="digital", text=message_text, ai_generated=False))
        db.add(models.GiftToken(order_id=order.id))
        return order

    _order_with_extras(
        buyer_id=alex.id, recipient=anna, flower_name="Pink Peony Bunch", size="medium", color="pink",
        occasion="birthday", delivery_date=today - timedelta(days=30), status="delivered",
        window=("09:00", "12:00"), address_id=alex_address.id,
        message_text="Happy birthday, Mama! Sending you all my love and these peonies you adore.",
    )
    _order_with_extras(
        buyer_id=alex.id, recipient=maria, flower_name="White Lily Arrangement", size="medium", color="white",
        occasion="congratulations", delivery_date=today - timedelta(days=10), status="delivered",
        window=("12:00", "15:00"), address_id=alex_address.id,
        message_text="Congratulations, Maria! So proud of you - hope these lilies brighten your day.",
    )
    # This one includes the wishlist vase Alex had saved for Anna - a real
    # example of "additional gift" showing up in sent gift history.
    _order_with_extras(
        buyer_id=alex.id, recipient=anna, flower_name="Grand Mixed Celebration Bouquet", size="large", color="mixed",
        occasion="anniversary", delivery_date=today - timedelta(days=45), status="delivered",
        window=("15:00", "18:00"), address_id=alex_address.id,
        message_text="Happy anniversary, Mom! Wishing you and Dad many more happy years together.",
        wishlist_item_id=vase.id,
    )
    _order_with_extras(
        buyer_id=alex.id, recipient=anahit, flower_name="Sunshine Tulip Mix", size="small", color="yellow",
        occasion="birthday", delivery_date=today + timedelta(days=3), status="placed",
        window=("09:00", "12:00"), address_id=alex_address.id,
        message_text="Happy early birthday, Anahit! Can't wait to celebrate with you soon.",
    )

    # A second, minimal user whose sole purpose is to have sent Alex a gift,
    # so Alex's "received" gift history tab isn't empty.
    davit = models.User(
        first_name="Davit", last_name="Petrosyan", email="davit.petrosyan@hadiya.demo",
        password_hash=hash_secret("HadiyaDemo123!"), email_verified=True,
    )
    db.add(davit)
    db.flush()

    davit_address = models.Address(
        user_id=davit.id, label="Home", line1="7 Mashtots Avenue", city="Yerevan",
        region="Yerevan", postal_code="0009", country="Armenia", is_default=True,
    )
    db.add(davit_address)
    db.flush()

    # linked_user_id ties this Person record back to Alex's own account, which
    # is what makes the order below surface under Alex's "received" tab.
    alex_as_seen_by_davit = models.Person(
        owner_id=davit.id, name="Alex", relationship_type="friend", linked_user_id=alex.id,
    )
    db.add(alex_as_seen_by_davit)
    db.flush()

    # Davit's own wishlist entry for Alex - included on the hydrangea order
    # below, so a real example of "additional gift" shows up in received
    # gift history too.
    perfume = models.WishlistItem(
        owner_id=davit.id, person_id=alex_as_seen_by_davit.id, product_name="Perfume - Eau de Parfum",
        image_url="/photos/product_perfume.jpg",
    )
    db.add(perfume)
    db.flush()

    _order_with_extras(
        buyer_id=davit.id, recipient=alex_as_seen_by_davit, flower_name="Blue Hydrangea Bunch",
        size="medium", color="blue", occasion="just_because", delivery_date=today - timedelta(days=15),
        status="delivered", window=("18:00", "21:00"), address_id=davit_address.id,
        message_text="Thinking of you, Alex - hope this brightens your day!",
        wishlist_item_id=perfume.id,
    )

    db.commit()
    print(
        "Seeded demo persona: alex.israelyan@hadiya.demo / HadiyaDemo123! "
        "(3 people, 4 sent orders, 1 received order, 5 wishlist items) "
        "plus sender davit.petrosyan@hadiya.demo / HadiyaDemo123!"
    )


if __name__ == "__main__":
    run()
