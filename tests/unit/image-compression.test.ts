import { describe, expect, it } from "vitest";
import { PRODUCT_IMAGE_ACCEPT_ATTRIBUTE, formatFileSize, getProductImageCompressionErrorMessage } from "@/lib/image-compression";

describe("image compression helpers", () => {
  it("returns a specific message for undecodable images", () => {
    expect(getProductImageCompressionErrorMessage(new Error("The source image could not be decoded."))).toBe(
      "No pudimos leer la imagen. Probá con otro JPG, PNG, WebP, HEIC o HEIF.",
    );
  });

  it("allows iPhone HEIC/HEIF images in the file picker", () => {
    expect(PRODUCT_IMAGE_ACCEPT_ATTRIBUTE).toContain("image/heic");
    expect(PRODUCT_IMAGE_ACCEPT_ATTRIBUTE).toContain("image/heif");
    expect(PRODUCT_IMAGE_ACCEPT_ATTRIBUTE).toContain(".heic");
    expect(PRODUCT_IMAGE_ACCEPT_ATTRIBUTE).toContain(".heif");
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
