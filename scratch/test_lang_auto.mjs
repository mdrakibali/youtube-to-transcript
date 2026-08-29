import { fetchTranscript, listLanguages } from "youtube-transcript-plus";

async function test(videoId) {
  console.log(`\n--- Testing ${videoId} ---`);
  try {
    const languages = await listLanguages(videoId);
    console.log("Available languages:", languages);

    // Pick requested lang, or English if available, otherwise the first available language!
    let targetLang = undefined;
    if (languages && languages.length > 0) {
      const enTrack = languages.find((l) => l.languageCode === "en" || l.languageCode.startsWith("en"));
      if (enTrack) {
        targetLang = enTrack.languageCode;
      } else {
        targetLang = languages[0].languageCode;
      }
    }

    console.log("Selected targetLang:", targetLang);

    const result = await fetchTranscript(videoId, {
      videoDetails: true,
      lang: targetLang,
    });

    console.log("Title:", result.videoDetails.title);
    console.log("Segments count:", result.segments.length);
    console.log("First segment:", result.segments[0]);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function run() {
  await test("7HjDcv75spg"); // Bangla video (Sumit)
  await test("HeQX2HjkcNo"); // English video (Veritasium)
}
run();
