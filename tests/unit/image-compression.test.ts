import { describe, expect, it } from "vitest";
import { formatFileSize, getProductImageCompressionErrorMessage } from "@/lib/image-compression";

describe("image compression helpers", () => {
  it("returns a specific message for undecodable images", () => {
    expect(getProductImageCompressionErrorMessage(new Error("The source image could not be decoded."))).toBe(
      "No pudimos leer la imagen. Probá con otro JPG, PNG o WebP.",
    );
  });

  it("returns a generic message for other compression failures", () => {
    expect(getProductImageCompressionErrorMessage(new Error("Canvas unavailable"))).toBe(
      "No pudimos optimizar la imagen. Probá con otro archivo.",
    );
  });

  it("formats small files with a minimum of one kilobyte", () => {
    expect(formatFileSize(409)).toBe("1 KB");
  });
});
