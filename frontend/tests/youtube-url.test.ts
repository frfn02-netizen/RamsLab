import { describe, expect, it } from "vitest";
import { extractYouTubeId } from "@/lib/youtube";

const ID = "dQw4w9WgXcQ";

describe("extractYouTubeId", () => {
  it("parses standard watch URLs and ignores extra parameters", () => {
    expect(
      extractYouTubeId(
        `https://www.youtube.com/watch?v=${ID}&si=tracking&list=PL123&t=42`,
      ),
    ).toBe(ID);
  });

  it("parses short links", () => {
    expect(extractYouTubeId(`https://youtu.be/${ID}?si=tracking`)).toBe(ID);
    expect(extractYouTubeId(`youtu.be/${ID}`)).toBe(ID);
  });

  it("parses embed URLs", () => {
    expect(
      extractYouTubeId(`https://www.youtube.com/embed/${ID}?autoplay=1&rel=0`),
    ).toBe(ID);
    expect(
      extractYouTubeId(
        `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1`,
      ),
    ).toBe(ID);
  });

  it("parses Shorts URLs", () => {
    expect(
      extractYouTubeId(`https://youtube.com/shorts/${ID}?feature=share`),
    ).toBe(ID);
  });

  it("rejects invalid hosts, invalid IDs, and empty input", () => {
    expect(extractYouTubeId(`https://example.com/watch?v=${ID}`)).toBeNull();
    expect(
      extractYouTubeId("https://www.youtube.com/watch?v=short"),
    ).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId("javascript:alert(1)")).toBeNull();
  });
});
