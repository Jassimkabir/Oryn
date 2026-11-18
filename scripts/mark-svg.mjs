// Shared by vectorize-mark.mjs and icons.mjs: assembles the vector mark from its
// geometry (brand/mark/geometry.json) and two smooth shading fields.
import sharp from "sharp";

/** Shading fields hold no edges, so half resolution JPEG is visually lossless. */
export async function texture(png, width, height) {
	const jpg = await sharp(png)
		.resize(Math.round(width / 2), Math.round(height / 2), { kernel: "lanczos3" })
		.jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
		.toBuffer();
	return `data:image/jpeg;base64,${jpg.toString("base64")}`;
}

export function markSvg({ width, height, ring, band }, faceHref, bandHref) {
	return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}"><defs><clipPath id="r"><path clip-rule="evenodd" d="${ring}"/></clipPath><clipPath id="b"><path d="${band}"/></clipPath></defs><g clip-path="url(#r)"><image width="${width}" height="${height}" preserveAspectRatio="none" xlink:href="${faceHref}"/><g clip-path="url(#b)"><image width="${width}" height="${height}" preserveAspectRatio="none" xlink:href="${bandHref}"/></g></g></svg>`;
}
