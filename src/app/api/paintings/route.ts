import { NextResponse } from "next/server";
import { aicImageUrl } from "@/lib/engine/mood";
import type { VibeSwatch } from "@/lib/types";

/**
 * Curated pool of Art Institute of Chicago artwork image IDs,
 * grouped by mood quadrant. Each artwork has individual VA values
 * calibrated to its visual mood within the quadrant range.
 *
 * Total: ~125 artworks across 5 quadrants.
 */
interface ArtEntry {
  imageId: string;
  title: string;
  artist: string;
  valence: number;
  arousal: number;
}

const ART_POOL: Record<string, ArtEntry[]> = {
  // ── Q1: Happy / Energetic ──────────────────────────────────
  // Bright, vivid, joyful — Impressionism, Post-Impressionism, celebrations
  // VA range: V +0.4 to +0.8, A +0.3 to +0.9
  "vibe-energetic": [
    { imageId: "3c27b499-af56-f0d5-93b5-a7f2f1ad5813", title: "Water Lilies", artist: "Claude Monet", valence: 0.6, arousal: 0.4 },
    { imageId: "2d484387-2509-5e8e-2c43-22f9981972eb", title: "A Sunday on La Grande Jatte", artist: "Georges Seurat", valence: 0.5, arousal: 0.5 },
    { imageId: "be0d3e50-a600-6f33-ea8f-16a34d892442", title: "Stacks of Wheat (Sunset)", artist: "Claude Monet", valence: 0.7, arousal: 0.6 },
    { imageId: "838d8c33-a3b4-68ea-587b-87ceec2011af", title: "Branch of the Seine near Giverny", artist: "Claude Monet", valence: 0.6, arousal: 0.3 },
    { imageId: "1f925e43-ff81-5ad7-da75-b28ea651c09f", title: "Irises", artist: "Claude Monet", valence: 0.6, arousal: 0.5 },
    { imageId: "e72305c9-1a1c-8a36-7450-582619366338", title: "Flower Girl in Holland", artist: "George Hitchcock", valence: 0.7, arousal: 0.4 },
    { imageId: "3a608f55-d76e-fa96-d0b1-0789fbc48f1e", title: "Two Sisters (On the Terrace)", artist: "Pierre-Auguste Renoir", valence: 0.8, arousal: 0.5 },
    { imageId: "67d6549f-c468-38f5-9cf3-c6a26be709df", title: "Jeanne (Spring)", artist: "Edouard Manet", valence: 0.7, arousal: 0.4 },
    { imageId: "827d02ef-6765-9728-c07e-52ad22b73fd3", title: "Waterloo Bridge, Sunlight Effect", artist: "Claude Monet", valence: 0.6, arousal: 0.5 },
    { imageId: "8534685d-1102-e1e3-e194-94f6e925e8b0", title: "Water Lily Pond", artist: "Claude Monet", valence: 0.5, arousal: 0.4 },
    { imageId: "db94c894-a24c-c2e0-9db9-0506567a0152", title: "Poppy Field (Giverny)", artist: "Claude Monet", valence: 0.8, arousal: 0.6 },
    { imageId: "85d05bad-1205-6de5-e75c-ec9113a626ab", title: "Still Life: Corner of a Table", artist: "Henri Fantin-Latour", valence: 0.5, arousal: 0.3 },
    { imageId: "a67c4473-57a4-9807-a94e-1136d3daf876", title: "A Holiday", artist: "Edward Henry Potthast", valence: 0.8, arousal: 0.7 },
    { imageId: "96f23681-9701-a668-5c3f-6ffa951f7ecc", title: "The Vase of Tulips", artist: "Paul Cezanne", valence: 0.5, arousal: 0.4 },
    { imageId: "43249182-2ef0-8d18-3d32-0b9af3606ed3", title: "Ballet Dancers", artist: "Henri de Toulouse-Lautrec", valence: 0.6, arousal: 0.7 },
    { imageId: "defb4004-b500-218d-3d9b-9a02423f097d", title: "At the Moulin Rouge", artist: "Henri de Toulouse-Lautrec", valence: 0.5, arousal: 0.8 },
    { imageId: "4346487d-e18a-d27e-76c1-7529c7f53742", title: "Bacchic Revels", artist: "Johann Georg Platzer", valence: 0.7, arousal: 0.9 },
    { imageId: "b89120e5-4c29-8b1c-8c4d-855850ae5596", title: "Spanish Dance", artist: "Hilaire Germain Edgar Degas", valence: 0.6, arousal: 0.8 },
    { imageId: "747149cf-b1eb-4877-52cb-49ba2341a72b", title: "Merrymakers in an Inn", artist: "Adriaen van Ostade", valence: 0.7, arousal: 0.7 },
    { imageId: "12f32e59-cba2-0a32-972e-cf4d7856560c", title: "An Abundance of Fruit", artist: "Severin Roesen", valence: 0.6, arousal: 0.4 },
    { imageId: "26e1c560-acca-3148-46dc-c144ac22bd3e", title: "Near the Lake", artist: "Pierre-Auguste Renoir", valence: 0.7, arousal: 0.4 },
    { imageId: "0787ea3c-9c03-65a2-adeb-5f5343794324", title: "Spring in France", artist: "Robert William Vonnoh", valence: 0.7, arousal: 0.5 },
    { imageId: "6804edc0-63d0-5b92-bb56-bc59192c00bd", title: "A Mother's Joy", artist: "Edvard Munch", valence: 0.8, arousal: 0.5 },
    { imageId: "cb178a5a-6c55-c423-a186-d3d467a72f2f", title: "The Dance", artist: "Pietro Longhi", valence: 0.6, arousal: 0.7 },
    { imageId: "3e005f8a-d37f-871b-15bb-89756f1ed2e9", title: "Fruits of the Midi", artist: "Pierre-Auguste Renoir", valence: 0.6, arousal: 0.3 },
  ],

  // ── Q2: Tense / Intense ────────────────────────────────────
  // Dark, dramatic, turbulent — storms, battles, chiaroscuro
  // VA range: V -0.3 to -0.7, A +0.5 to +0.9
  "vibe-chaotic": [
    { imageId: "97314d3d-dc9b-fd8e-644e-eb5150f16721", title: "The Dark Mountain", artist: "Marsden Hartley", valence: -0.4, arousal: 0.6 },
    { imageId: "2dac951c-974d-6540-473f-59e1aedb77b2", title: "A Dark Corner", artist: "Anders Zorn", valence: -0.3, arousal: 0.5 },
    { imageId: "9cde7577-d4ba-f7f5-473c-0063a064491e", title: "Dramatic and Grandiose", artist: "Odilon Redon", valence: -0.4, arousal: 0.7 },
    { imageId: "cc3f90c6-657e-f9d9-8ca8-186f77229314", title: "Tenebres (Darkness)", artist: "Odilon Redon", valence: -0.6, arousal: 0.6 },
    { imageId: "c5dbb973-a2fd-755a-c1be-cd2660ccf5af", title: "Adam", artist: "Auguste Rodin", valence: -0.3, arousal: 0.7 },
    { imageId: "b0449785-8df5-5c84-9b0b-cf5cbd1f3752", title: "Self-Portrait in Cap and Scarf", artist: "Rembrandt van Rijn", valence: -0.3, arousal: 0.5 },
    { imageId: "5ee3644e-7067-bbce-6d20-31aaa406f67e", title: "Presentation in the Temple", artist: "Rembrandt van Rijn", valence: -0.3, arousal: 0.6 },
    { imageId: "a49c5ada-f461-d7d1-0f1b-468ac577a872", title: "The Resurrection", artist: "Cecco del Caravaggio", valence: -0.4, arousal: 0.8 },
    { imageId: "b3974542-b9b4-7568-fc4b-966738f61d78", title: "The Great Wave off Kanagawa", artist: "Katsushika Hokusai", valence: -0.3, arousal: 0.9 },
    { imageId: "a5274397-409c-1f76-866f-17d55cf31933", title: "Battle Scene", artist: "Hippolyte Bellange", valence: -0.5, arousal: 0.9 },
    { imageId: "04cb7292-b20b-b313-2c08-19e685b70e7e", title: "Approaching Storm", artist: "Eugene Louis Boudin", valence: -0.4, arousal: 0.7 },
    { imageId: "d4574667-943d-6e28-ec30-fe9c91eeeca1", title: "The Combat of the Giaour and Hassan", artist: "Eugene Delacroix", valence: -0.6, arousal: 0.9 },
    { imageId: "80df29cd-493f-23c0-3e51-4ddc38b3f34f", title: "Barks Fleeing Before the Storm", artist: "Jules Dupre", valence: -0.5, arousal: 0.8 },
    { imageId: "ff7cae53-a6f6-9965-70e9-7e264ead9265", title: "The Storm", artist: "Georges Michel", valence: -0.5, arousal: 0.8 },
    { imageId: "05dcffe0-97a9-cd59-df71-73731a5dbd9f", title: "The Storm", artist: "George Inness", valence: -0.4, arousal: 0.7 },
    { imageId: "f44ea1e3-4f02-1ee2-24cf-b7e33bf5b2c1", title: "The Return from Russia", artist: "Theodore Gericault", valence: -0.6, arousal: 0.7 },
    { imageId: "aef4f326-4330-ff4a-2ea1-12c4678f08c0", title: "Storm", artist: "Anders Zorn", valence: -0.4, arousal: 0.8 },
    { imageId: "6794f986-98db-4e2e-9b38-8d13b7201d10", title: "Breaking Storm, Coast of Maine", artist: "Winslow Homer", valence: -0.4, arousal: 0.8 },
    { imageId: "45d173cb-c518-4052-61b8-03902e521631", title: "A Heroic Feat! With Dead Men!", artist: "Francisco de Goya", valence: -0.7, arousal: 0.9 },
    { imageId: "107dd824-9ae2-b091-9787-5901d5e300da", title: "The Ecstasy of Saint Francis", artist: "Giovanni Baglione", valence: -0.3, arousal: 0.7 },
    { imageId: "833b1d8d-9e16-efb3-e848-73552c9b8404", title: "Samson and the Lion", artist: "Cristoforo Stati", valence: -0.5, arousal: 0.9 },
    { imageId: "2e39dea6-1204-8fb2-8493-f9ce99846126", title: "Cover for Paris Intense", artist: "Felix Vallotton", valence: -0.4, arousal: 0.6 },
    { imageId: "3b374643-5328-3e00-c02b-5ab56e5ae8f8", title: "The Scream", artist: "Edvard Munch", valence: -0.7, arousal: 0.9 },
    { imageId: "1b5f0ebd-8540-c9bd-b910-b1fb0580361f", title: "The Crossing of the Granicus", artist: "Karel van Mander II", valence: -0.5, arousal: 0.8 },
    { imageId: "9eb5693e-eeea-b2cd-a021-18628daf6182", title: "Ghost Dance (The Vision of Life)", artist: "Ralph Albert Blakelock", valence: -0.3, arousal: 0.6 },
  ],

  // ── Q3: Sad / Melancholy ───────────────────────────────────
  // Quiet, nocturnal, wintry, lonely — night scenes, snow, solitude
  // VA range: V -0.2 to -0.6, A -0.3 to -0.8
  "vibe-still": [
    { imageId: "b20656bc-a06c-6ddc-dceb-7f8cf4bbe439", title: "Love's Melancholy", artist: "Constant Mayer", valence: -0.5, arousal: -0.5 },
    { imageId: "33722a6a-955b-c0fa-f297-5c0b095e7759", title: "Melancholy", artist: "Odilon Redon", valence: -0.5, arousal: -0.4 },
    { imageId: "d7df2633-3b40-f570-c906-211503a37cde", title: "The Girl by the Window", artist: "Edvard Munch", valence: -0.4, arousal: -0.5 },
    { imageId: "4d5ed6f2-13f0-4e23-0860-2476964a0fa6", title: "Melancholy III", artist: "Edvard Munch", valence: -0.5, arousal: -0.4 },
    { imageId: "50034c7f-ce51-00f1-430e-a6f7efc233fc", title: "Nocturne: Blue and Gold", artist: "James McNeill Whistler", valence: -0.3, arousal: -0.6 },
    { imageId: "4425984b-e241-6413-1404-cdac0fb06518", title: "Moonrise", artist: "George Inness", valence: -0.2, arousal: -0.5 },
    { imageId: "5536bde4-5780-2ad4-65e3-8bd47c9d3cc7", title: "Under the Lamp", artist: "Mary Cassatt", valence: -0.2, arousal: -0.4 },
    { imageId: "1f209f36-e526-096c-4fcb-c27c454440ca", title: "Ode on Melancholy", artist: "Will Hicock Low", valence: -0.5, arousal: -0.3 },
    { imageId: "3454713a-b08e-46f1-302c-d61ed1168293", title: "The Solitude of the Soul", artist: "Lorado Taft", valence: -0.5, arousal: -0.6 },
    { imageId: "63e18e3e-35a6-699c-a824-d75228c2f1fa", title: "Solitude", artist: "Joshua Shaw", valence: -0.4, arousal: -0.7 },
    { imageId: "f8fd76e9-c396-5678-36ed-6a348c904d27", title: "Paris Street; Rainy Day", artist: "Gustave Caillebotte", valence: -0.2, arousal: -0.3 },
    { imageId: "66ebff3a-12b4-763f-8f56-167301b59360", title: "Snow at Akabane Bridge", artist: "Utagawa Hiroshige", valence: -0.3, arousal: -0.5 },
    { imageId: "0c025221-1687-3a83-c0ba-018d05f37b27", title: "Nocturne", artist: "James McNeill Whistler", valence: -0.3, arousal: -0.7 },
    { imageId: "3ae75415-0551-ae17-c478-3b8687a6f246", title: "Icebound", artist: "John Henry Twachtman", valence: -0.4, arousal: -0.6 },
    { imageId: "0e3d4d25-88ac-f091-5ea0-0196a905b84a", title: "Self-Portrait in Moonlight", artist: "Edvard Munch", valence: -0.4, arousal: -0.4 },
    { imageId: "53109c2c-7a19-2232-10b2-c05af5986c84", title: "Moonlight. Night in St Cloud", artist: "Edvard Munch", valence: -0.4, arousal: -0.6 },
    { imageId: "ce139289-2c97-166a-41d6-241209c15106", title: "Nocturne: Palaces", artist: "James McNeill Whistler", valence: -0.2, arousal: -0.7 },
    { imageId: "1f7f712b-fb17-2a1a-270d-a877b6245165", title: "Twilight", artist: "Olin Levi Warner", valence: -0.3, arousal: -0.5 },
    { imageId: "13929657-1c8f-be57-4ea6-3aed6411a733", title: "Twilight with Haystacks", artist: "Camille Pissarro", valence: -0.2, arousal: -0.5 },
    { imageId: "8e5f3773-9396-0fde-8547-490cca07b68b", title: "Snow Field, Morning, Roxbury", artist: "John La Farge", valence: -0.3, arousal: -0.6 },
    { imageId: "0b6df0f9-56d4-3576-239c-c73967ec0429", title: "Heavy Snow", artist: "Utagawa Hiroshige", valence: -0.4, arousal: -0.5 },
    { imageId: "61c3e72f-b453-1ada-62a5-9539afbe0641", title: "Winter Scene", artist: "Francisco de Goya", valence: -0.4, arousal: -0.4 },
    { imageId: "a169d2cc-935d-2509-6ded-f9716117d293", title: "Night Rain at a Shrine", artist: "Kitao Shigemasa", valence: -0.3, arousal: -0.6 },
    { imageId: "ba163db0-6484-8fd7-aff9-5016a4a6142a", title: "The Dance House: Nocturne", artist: "James McNeill Whistler", valence: -0.2, arousal: -0.5 },
    { imageId: "fa96ef54-c3b1-8f4d-390a-219f7bc64c4a", title: "Man Riding through the Snow", artist: "Adolphe Schreyer", valence: -0.4, arousal: -0.3 },
  ],

  // ── Q4: Calm / Peaceful ────────────────────────────────────
  // Serene, pastoral, gentle — gardens, meadows, calm water
  // VA range: V +0.3 to +0.7, A -0.2 to -0.6
  "vibe-flowing": [
    { imageId: "d4bc1723-7cbc-d36d-a9cb-f84553f2a6f6", title: "The Poet's Garden", artist: "Vincent van Gogh", valence: 0.5, arousal: -0.3 },
    { imageId: "5edb357d-2e8f-8673-d9e8-4b1150af3895", title: "Woman in a Garden", artist: "Berthe Morisot", valence: 0.5, arousal: -0.4 },
    { imageId: "931edccd-9a37-bfa7-d9a5-13d644956b40", title: "Tarragona Terrace and Garden", artist: "John Singer Sargent", valence: 0.6, arousal: -0.3 },
    { imageId: "0ace29f2-7bc1-714a-c364-12b57bcf8a93", title: "The Keeper of the Flock", artist: "Jean Francois Millet", valence: 0.4, arousal: -0.5 },
    { imageId: "61f1c1ad-8414-4b6d-3710-b9ef6bdfd594", title: "The Garden", artist: "James McNeill Whistler", valence: 0.4, arousal: -0.4 },
    { imageId: "f6eddea6-5789-b6f9-315c-50a08a7c4adc", title: "Fete champetre", artist: "Jean Antoine Watteau", valence: 0.6, arousal: -0.2 },
    { imageId: "3cb2a7b7-f4ee-8cc8-bb14-1754cf1e8507", title: "Ideal Pastoral Life", artist: "Edward Calvert", valence: 0.5, arousal: -0.5 },
    { imageId: "ad3280c6-611a-c136-29b8-8f303a02f416", title: "Landscape with Figures", artist: "Narcisse Virgile Diaz de la Pena", valence: 0.4, arousal: -0.4 },
    { imageId: "8be90e71-83c3-3f98-a972-4acb9ce0e773", title: "Sea View, Calm Weather", artist: "Edouard Manet", valence: 0.4, arousal: -0.6 },
    { imageId: "a34d9d72-c4ec-0750-389e-a01215c9aab0", title: "Pastoral Landscape with Ruins", artist: "Adriaen van de Velde", valence: 0.4, arousal: -0.5 },
    { imageId: "b246d3eb-8bfe-a031-4848-e00c053546ea", title: "Fishing Boats in a Calm", artist: "Jan van de Cappelle", valence: 0.4, arousal: -0.6 },
    { imageId: "cd2ebc0d-eea7-d476-1a57-daf8a3976675", title: "Pastoral Scene", artist: "Giovanni Battista Piazzetta", valence: 0.5, arousal: -0.3 },
    { imageId: "3e82db48-5f93-ada3-7ab2-f97328ccc1bd", title: "The Garden of Paradise", artist: "Workshop of Hieronymus Bosch", valence: 0.6, arousal: -0.2 },
    { imageId: "ff1f84a4-fa89-0782-0b2b-e1e1d6b0aeb4", title: "Beer Garden in Rosenheim", artist: "Max Liebermann", valence: 0.6, arousal: -0.2 },
    { imageId: "25cae01d-82c7-7060-0070-643727437126", title: "Souvenir of the Environs of Lake Nemi", artist: "Jean Baptiste Camille Corot", valence: 0.5, arousal: -0.5 },
    { imageId: "5512cee9-6d00-d01b-b0be-ac7843cc8f76", title: "Fishing in Spring", artist: "Vincent van Gogh", valence: 0.5, arousal: -0.3 },
    { imageId: "1501b057-0441-f1fa-e949-298b06ec6270", title: "Landscape", artist: "Jean Baptiste Camille Corot", valence: 0.4, arousal: -0.5 },
    { imageId: "31f0a9a3-8a0d-44ed-6de8-66142b75c4c0", title: "The Bathers", artist: "William Adolphe Bouguereau", valence: 0.6, arousal: -0.2 },
    { imageId: "ef96e79b-f481-8114-0804-4bd39c101983", title: "Early Morning, Tarpon Springs", artist: "George Inness", valence: 0.5, arousal: -0.4 },
    { imageId: "6a1f9072-1781-a65e-d94a-9d67657966ef", title: "Joy with Tranquility", artist: "Eduardus Jacobus", valence: 0.6, arousal: -0.4 },
    { imageId: "54c8b002-99a8-a416-f4e7-a0126e1e5c98", title: "Salisbury Cathedral from the Meadows", artist: "David Lucas", valence: 0.4, arousal: -0.3 },
    { imageId: "554f515f-c820-54ec-98f7-fc20e441f2fa", title: "The Castle Above the Meadows", artist: "Joseph Mallord William Turner", valence: 0.5, arousal: -0.3 },
    { imageId: "16edc7fd-818e-60a3-b9e4-ac24bb28e272", title: "Pastoral Scene", artist: "Jean Baptiste Pillement", valence: 0.5, arousal: -0.4 },
    { imageId: "92ad2a28-eac9-e358-6e3c-1c1cf39efd91", title: "Allegory of Peace and War", artist: "Pompeo Girolamo Batoni", valence: 0.3, arousal: -0.2 },
    { imageId: "db011c71-561d-21b2-d882-01e8054941be", title: "Spring Showers", artist: "Alfred Stieglitz", valence: 0.3, arousal: -0.4 },
  ],

  // ── Center: Balanced ───────────────────────────────────────
  // Classical, everyday, still life, portraits — timeless, neutral
  // VA range: V -0.2 to +0.2, A -0.2 to +0.2
  "vibe-balanced": [
    { imageId: "47c5bcb8-62ef-e5d7-55e7-f5121f409a30", title: "Self-Portrait", artist: "Vincent van Gogh", valence: -0.1, arousal: 0.1 },
    { imageId: "9a29cc5d-3779-c9ab-2aa2-0df7b6c3f391", title: "Francesco de' Medici", artist: "Alessandro Allori", valence: 0.0, arousal: 0.0 },
    { imageId: "68452725-eba5-06e3-46d2-50c678a5d672", title: "Kitchen Scene", artist: "Diego Velazquez", valence: 0.0, arousal: 0.1 },
    { imageId: "3b885ae0-4d46-5fe4-d70a-00474827f02c", title: "The Child's Bath", artist: "Mary Cassatt", valence: 0.2, arousal: 0.0 },
    { imageId: "8f06717c-9ede-f22b-d13b-327a50c22f9c", title: "Woman at the Piano", artist: "Pierre-Auguste Renoir", valence: 0.2, arousal: -0.1 },
    { imageId: "d9bde524-38b2-4262-3338-e4d06a50746d", title: "Still Life with Dead Game", artist: "Frans Snyders", valence: -0.1, arousal: 0.0 },
    { imageId: "aa870b0d-5a1b-660a-6dc6-56c12109cf6e", title: "Landscape with Saint John on Patmos", artist: "Nicolas Poussin", valence: 0.1, arousal: -0.1 },
    { imageId: "5490fd49-dd52-4fd7-7d41-d871dcffae55", title: "The Captive Slave", artist: "John Philip Simpson", valence: -0.2, arousal: 0.1 },
    { imageId: "4a04138f-43d8-cd9f-5ac4-478cd8828210", title: "Trompe-l'Oeil Still Life", artist: "Adriaen van der Spelt", valence: 0.1, arousal: 0.0 },
    { imageId: "3cea045a-92d6-36cf-1508-2c99ea740218", title: "For Sunday's Dinner", artist: "William Michael Harnett", valence: 0.0, arousal: 0.0 },
    { imageId: "f2021182-1302-f76f-97f1-4e7850030e3b", title: "Still Life with Game Fowl", artist: "Juan Sanchez Cotan", valence: -0.1, arousal: 0.0 },
    { imageId: "574695d5-6bf3-fe58-a1d5-e6cbb5e10c77", title: "Still Life", artist: "Pieter Claesz", valence: 0.0, arousal: -0.1 },
    { imageId: "b2bc0fc2-8d17-1fcd-8cae-8626421c11ef", title: "Apples", artist: "Henri Matisse", valence: 0.2, arousal: 0.1 },
    { imageId: "a2f4085a-6715-212a-c5fa-aa88a4692df0", title: "Wine, Cheese, and Fruit", artist: "John F. Francis", valence: 0.1, arousal: 0.0 },
    { imageId: "0729fbba-51e3-a2d7-6d4d-61c2be62af3f", title: "Magnolias on Light Blue Velvet Cloth", artist: "Martin Johnson Heade", valence: 0.2, arousal: -0.1 },
    { imageId: "c12058f4-188f-c6ed-f0fe-52b32acfb296", title: "Apples and Grapes", artist: "Claude Monet", valence: 0.1, arousal: 0.0 },
    { imageId: "29163982-8310-36bb-3530-2b5000ce7290", title: "Kitchen Still Life", artist: "Paolo Antonio Barbieri", valence: 0.0, arousal: 0.1 },
    { imageId: "9e90fbeb-bd55-7921-26e4-dde3470c5bd9", title: "Woman Bathing", artist: "Mary Cassatt", valence: 0.0, arousal: 0.0 },
    { imageId: "335a59a4-3f5b-b9db-b8e8-861467d211ef", title: "Young Peasant Having Her Coffee", artist: "Camille Pissarro", valence: 0.1, arousal: -0.1 },
    { imageId: "147e3ce7-1c08-fa84-57f7-f59d4ec90d3c", title: "Young Woman Sewing", artist: "Pierre-Auguste Renoir", valence: 0.1, arousal: -0.2 },
    { imageId: "fd991fea-0c13-8444-7879-aba467f1d9db", title: "Woman Reading", artist: "Edouard Manet", valence: 0.1, arousal: -0.2 },
    { imageId: "6f513908-03cc-b974-633b-adfce56b7936", title: "The Millinery Shop", artist: "Hilaire Germain Edgar Degas", valence: 0.0, arousal: 0.1 },
    { imageId: "f11bd233-6cc3-4221-59eb-f7363be4119e", title: "Grapes, Lemons, Pears, and Apples", artist: "Vincent van Gogh", valence: 0.1, arousal: 0.0 },
    { imageId: "ea1e120f-2a56-99a8-99d8-ea824d466d65", title: "Bird's Nest and Ferns", artist: "Fidelia Bridges", valence: 0.2, arousal: -0.1 },
    { imageId: "e4df4d4a-4cfb-5be8-3728-0d0bf1b44751", title: "The Red Room, Etretat", artist: "Felix Vallotton", valence: 0.0, arousal: 0.1 },
  ],
};

/**
 * Return 5 paintings instantly from the curated pool (one per quadrant).
 * Random pick within each quadrant for variety across sessions.
 * Each artwork carries its own pre-calculated VA values.
 */
export async function GET() {
  const results: VibeSwatch[] = Object.entries(ART_POOL).map(([vibeId, pool]) => {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return {
      id: vibeId,
      imageUrl: aicImageUrl(pick.imageId, 600),
      title: pick.title,
      artist: pick.artist,
      valence: pick.valence,
      arousal: pick.arousal,
    };
  });

  // Shuffle so quadrant order isn't predictable
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }

  return NextResponse.json(results);
}
