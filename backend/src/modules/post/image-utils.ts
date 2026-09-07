import { ApiError } from '../../errors/ApiError';
import { randomImageName } from '../../utils/helper';
import { Images3Client } from '../../utils/s3-client';

export const MAX_POST_IMAGES = 10;

const IMAGE_EXTENSION_MAP: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
};

export function isSafeUploadedImageName(imageName: string): boolean {
    if (!imageName || typeof imageName !== 'string') return false;
    if (imageName.length > 100) return false;
    if (imageName.includes('/') || imageName.includes('\\')) return false;

    return /^[a-f0-9]{64}\.(?:jpg|png|gif|webp|svg)$/i.test(imageName);
}

export function parseImageDataUrl(image: string): {
    buffer: Buffer;
    mimeType: string;
    extension: string;
} | null {
    const matches = image.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/
    );
    if (!matches || matches.length !== 3) return null;

    const mimeType = matches[1].toLowerCase();
    const extension = IMAGE_EXTENSION_MAP[mimeType];
    if (!extension) return null;

    const buffer = Buffer.from(matches[2].replace(/\s+/g, ''), 'base64');
    return { buffer, mimeType, extension };
}

export function collectImageInputs(
    image?: string | null,
    images?: unknown
): string[] {
    const collected: string[] = [];

    if (typeof image === 'string' && image.trim()) {
        collected.push(image.trim());
    }

    if (Array.isArray(images)) {
        for (const item of images) {
            if (typeof item === 'string' && item.trim()) {
                collected.push(item.trim());
            }
        }
    }

    return collected;
}

export async function resolveImageInput(image: string): Promise<string> {
    const trimmed = image.trim();

    if (trimmed.startsWith('data:')) {
        const parsed = parseImageDataUrl(trimmed);
        if (!parsed) {
            throw new ApiError(400, 'invalid_image_format');
        }
        if (parsed.buffer.length > 10 * 1024 * 1024) {
            throw new ApiError(400, 'image_size_too_large');
        }

        const imageName = randomImageName() + parsed.extension;
        const uploaded = await Images3Client.uploadFile(
            parsed.buffer,
            parsed.mimeType,
            `images/${imageName}`
        );
        if (!uploaded) {
            throw new ApiError(500, 'server_error');
        }
        return imageName;
    }

    if (!isSafeUploadedImageName(trimmed)) {
        throw new ApiError(400, 'invalid_image_format');
    }

    return trimmed;
}

export async function resolveImageInputs(inputs: string[]): Promise<string[]> {
    if (inputs.length > MAX_POST_IMAGES) {
        throw new ApiError(400, 'too_many_images');
    }

    const names: string[] = [];
    const seen = new Set<string>();

    for (const input of inputs) {
        const imageName = await resolveImageInput(input);
        if (!seen.has(imageName)) {
            seen.add(imageName);
            names.push(imageName);
        }
    }

    return names;
}

export function mergePostImageList(
    primaryImage?: string | null,
    extraImages?: unknown
): string[] {
    let extras: string[] = [];

    if (Array.isArray(extraImages)) {
        extras = extraImages.filter(
            (item): item is string =>
                typeof item === 'string' && item.length > 0
        );
    } else if (typeof extraImages === 'string' && extraImages.trim()) {
        try {
            const parsed = JSON.parse(extraImages);
            if (Array.isArray(parsed)) {
                extras = parsed.filter(
                    (item): item is string =>
                        typeof item === 'string' && item.length > 0
                );
            }
        } catch {
            extras = [];
        }
    }

    if (extras.length > 0) {
        return extras;
    }

    return primaryImage ? [primaryImage] : [];
}

export function attachGalleryImages<T extends { image?: string | null }>(
    post: T & { extra_images?: unknown }
): T & { images: string[] } {
    const images = mergePostImageList(post.image, post.extra_images);
    const rest = { ...post };
    delete rest.extra_images;

    return {
        ...rest,
        image: images[0] ?? post.image ?? null,
        images,
    };
}

export const POST_IMAGE_JSON_SUBQUERY = `(
    SELECT JSON_ARRAYAGG(pi.image_url ORDER BY pi.id)
    FROM PostImage pi
    WHERE pi.post_id = po.id
) AS extra_images`;
