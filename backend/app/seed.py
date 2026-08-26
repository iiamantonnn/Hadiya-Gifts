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
         price_cents=6500, images=["/seed/rose-red.svg"], flower_type="roses", colors=["red"],
         sizes=["small", "medium", "large"], occasions=["romantic", "anniversary", "just_because"],
         recommended_relationships=["partner"], care_instructions="Re-cut stems at an angle before placing in water.",
         water_instructions="Change water every 2 days; keep the vase full.", stem_instructions="Remove leaves below the waterline.",
         placement_instructions="Keep away from direct sun and heating vents.", avoid_notes="Avoid placing near ripening fruit.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-7 days."),
    dict(name="White Rose Bouquet", description="Elegant white roses for moments that call for quiet grace.",
         price_cents=6000, images=["/seed/rose-white.svg"], flower_type="roses", colors=["white"],
         sizes=["small", "medium", "large"], occasions=["sympathy", "congratulations", "thank_you"],
         recommended_relationships=["mother", "colleague", "friend"], care_instructions="Trim 1cm off stems every few days.",
         water_instructions="Use lukewarm water and flower food if provided.", stem_instructions="Cut at a 45-degree angle.",
         placement_instructions="Cool room, out of direct sunlight.", avoid_notes="Avoid drafty spots near doors.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-7 days."),
    dict(name="Pink Peony Bunch", description="Soft, full peonies in blush pink - a favorite for spring occasions.",
         price_cents=8500, images=["/seed/peony-pink.svg"], flower_type="peonies", colors=["pink"],
         sizes=["medium", "large"], occasions=["birthday", "just_because", "thank_you"],
         recommended_relationships=["mother", "friend", "sibling"], care_instructions="Peonies open over 2-3 days once cut.",
         water_instructions="Keep water clean and change every other day.", stem_instructions="Re-cut stems on arrival.",
         placement_instructions="Cool spot, out of direct sun.", avoid_notes="Buds may be slightly sticky - this is normal.",
         estimated_lifespan_text="Estimated lifespan with proper care: 4-6 days."),
    dict(name="Sunshine Tulip Mix", description="A cheerful bunch of yellow and orange tulips.",
         price_cents=4200, images=["/seed/tulip-yellow.svg"], flower_type="tulips", colors=["yellow"],
         sizes=["small", "medium"], occasions=["birthday", "congratulations", "friendship"],
         recommended_relationships=["friend", "colleague"], care_instructions="Tulips continue to grow slightly after cutting.",
         water_instructions="Use cold water; change every 2 days.", stem_instructions="Trim stems straight, not at an angle.",
         placement_instructions="Cooler rooms keep tulips upright longer.", avoid_notes="Keep away from direct heat.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-8 days."),
    dict(name="Purple Tulip Bunch", description="Rich purple tulips for a thoughtful, understated gift.",
         price_cents=4200, images=["/seed/tulip-purple.svg"], flower_type="tulips", colors=["purple"],
         sizes=["small", "medium"], occasions=["thank_you", "just_because"],
         recommended_relationships=["friend", "grandparent"], care_instructions="Tulips continue to grow slightly after cutting.",
         water_instructions="Use cold water; change every 2 days.", stem_instructions="Trim stems straight, not at an angle.",
         placement_instructions="Cooler rooms keep tulips upright longer.", avoid_notes="Keep away from direct heat.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-8 days."),
    dict(name="White Lily Arrangement", description="Fragrant white lilies arranged with greenery.",
         price_cents=7200, images=["/seed/lily-white.svg"], flower_type="lilies", colors=["white"],
         sizes=["medium", "large"], occasions=["sympathy", "congratulations"],
         recommended_relationships=["mother", "grandparent", "colleague"], care_instructions="Remove pollen-heavy stamens to prevent staining.",
         water_instructions="Change water every 2-3 days.", stem_instructions="Re-cut stems every few days.",
         placement_instructions="Bright room, indirect light.", avoid_notes="Pollen can stain fabric - handle carefully.",
         estimated_lifespan_text="Estimated lifespan with proper care: 6-10 days."),
    dict(name="Blue Hydrangea Bunch", description="Full, cloud-like blue hydrangea blooms.",
         price_cents=7800, images=["/seed/hydrangea-blue.svg"], flower_type="mixed", colors=["blue"],
         sizes=["medium", "large"], occasions=["birthday", "just_because"],
         recommended_relationships=["mother", "friend"], care_instructions="Hydrangeas are thirsty - check water daily.",
         water_instructions="Top up water daily; mist petals lightly.", stem_instructions="Re-cut and split stem ends.",
         placement_instructions="Cool, humid spot away from direct sun.", avoid_notes="Wilts quickly if water runs low.",
         estimated_lifespan_text="Estimated lifespan with proper care: 4-6 days."),
    dict(name="Seasonal Wildflower Mix", description="A relaxed, garden-style mix of whatever's freshest this week.",
         price_cents=4800, images=["/seed/seasonal-mix.svg"], flower_type="seasonal", colors=["mixed"],
         sizes=["small", "medium", "large"], occasions=["just_because", "friendship", "thank_you"],
         recommended_relationships=["friend", "colleague", "sibling"], care_instructions="Mixed stems - trim all evenly.",
         water_instructions="Change water every 2 days.", stem_instructions="Remove any leaves below the waterline.",
         placement_instructions="Bright, indirect light.", avoid_notes="Remove any wilting stems promptly to preserve the rest.",
         estimated_lifespan_text="Estimated lifespan with proper care: 4-7 days."),
    dict(name="Grand Mixed Celebration Bouquet", description="A generous, colorful arrangement for big moments.",
         price_cents=9500, images=["/seed/mixed-grand.svg"], flower_type="mixed", colors=["mixed"],
         sizes=["large"], occasions=["congratulations", "birthday", "anniversary"],
         recommended_relationships=["partner", "mother", "friend"], care_instructions="Re-cut stems and change water every 2 days.",
         water_instructions="Keep the vase topped up.", stem_instructions="Remove lower leaves.",
         placement_instructions="Cool room, out of direct sun.", avoid_notes="Keep away from ripening fruit and heat sources.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-8 days."),
    dict(name="Pink Rose & Peony Duo", description="Pink roses and peonies paired for a soft, romantic look.",
         price_cents=8800, images=["/seed/rose-peony-pink.svg"], flower_type="mixed", colors=["pink"],
         sizes=["medium", "large"], occasions=["romantic", "anniversary", "birthday"],
         recommended_relationships=["partner"], care_instructions="Re-cut stems before arranging.",
         water_instructions="Change water every 2 days.", stem_instructions="Remove leaves below the waterline.",
         placement_instructions="Cool spot, indirect light.", avoid_notes="Keep away from direct heat.",
         estimated_lifespan_text="Estimated lifespan with proper care: 5-7 days."),
    dict(name="Petite Daisy Posy", description="A small, friendly bunch of white daisies - simple and sincere.",
         price_cents=2800, images=["/seed/daisy-white.svg"], flower_type="other", colors=["white"],
         sizes=["small"], occasions=["friendship", "just_because", "thank_you"],
         recommended_relationships=["friend", "colleague"], care_instructions="Trim stems and change water regularly.",
         water_instructions="Change water every 2 days.", stem_instructions="Cut at an angle.",
         placement_instructions="Bright, indirect light.", avoid_notes="Keep out of direct sun.",
         estimated_lifespan_text="Estimated lifespan with proper care: 4-6 days."),
    dict(name="Deep Purple Iris Bunch", description="Striking purple irises with a modern, architectural feel.",
         price_cents=5200, images=["/seed/iris-purple.svg"], flower_type="other", colors=["purple"],
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

        demo = db.query(models.User).filter(models.User.email == "demo@hadiya.app").first()
        if not demo:
            demo = models.User(
                first_name="Demo", last_name="User", email="demo@hadiya.app",
                preferred_name="Demo", password_hash=hash_secret("Demo12345!"),
                email_verified=True,
            )
            db.add(demo)
            db.flush()

            mom = models.Person(
                owner_id=demo.id, name="Mom", relationship_type="mother",
                birthday=date.today() + timedelta(days=9), favorite_flowers=["peonies", "roses"],
                favorite_colors=["pink", "white"], is_favorite=True, notes="Loves anything with peonies.",
            )
            best_friend = models.Person(
                owner_id=demo.id, name="Alex", relationship_type="friend",
                birthday=date.today() + timedelta(days=40), favorite_colors=["yellow"], is_favorite=True,
            )
            db.add_all([mom, best_friend])
            db.flush()

            db.add(models.ImportantDate(
                person_id=mom.id, date_type="mothers_day", occurs_on=date(date.today().year, 5, 11),
                recurring=True, reminder_offsets_days=[7, 3, 1, 0],
            ))

            db.add(models.WishlistItem(
                owner_id=demo.id, person_id=mom.id, product_name="Ceramic Vase - Speckled White",
                marketplace="Amazon", url="https://example.com/vase", color="White", material="Ceramic",
                notes="Would go perfectly with the peonies.",
            ))

            demo_address = models.Address(
                user_id=demo.id, label="Home", line1="123 Example St", city="Springfield",
                region="IL", postal_code="62704", country="USA", is_default=True,
            )
            db.add(demo_address)
            db.commit()
            print("Seeded demo account: demo@hadiya.app / Demo12345!")
        else:
            print("Demo account already exists, skipping.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
