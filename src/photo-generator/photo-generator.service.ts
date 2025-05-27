import { Injectable } from '@nestjs/common';
import * as SharpNS from 'sharp';
import { createCanvas, registerFont } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

// `sharp` may be exported differently depending on module system; normalize to a callable function
const sharp: any = (SharpNS as any).default ?? (SharpNS as any);

@Injectable()
export class PhotoGeneratorService {
    supportedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'];

    async generateImage(options: {
        inputDir: string;
        layersDir: string;
        fontPath: string;
        outputPath: string;
        text: string;
        textColor: string;
        width?: number;
        height?: number;
    }): Promise<string> {
        const {
            inputDir,
            layersDir,
            fontPath,
            outputPath,
            text,
            textColor,
            width = 1500,
            height = 1500,
        } = options;

        // Find input image file with supported extension
        let inputImagePath: string | null = null;
        for (const ext of this.supportedExtensions) {
            const candidate = path.join(inputDir, `input.${ext}`);
            if (fs.existsSync(candidate)) {
                inputImagePath = candidate;
                break;
            }
        }
        if (!inputImagePath) {
            throw new Error('Input image not found in inputDir with supported extensions');
        }

        // Load and resize input image
        const baseImage = await sharp(inputImagePath)
            .resize(width, height, { fit: 'contain' })
            .toBuffer();

        // Prepare layers
        const layers: { input: Buffer }[] = [];
        for (let i = 1; i <= 30; i++) {
            const layerName = `layer_${i.toString().padStart(2, '0')}.png`;
            const layerPath = path.join(layersDir, layerName);
            if (fs.existsSync(layerPath)) {
                const layerBuffer = await sharp(layerPath)
                    .resize(width, height, { fit: 'contain' })
                    .toBuffer();
                layers.push({ input: layerBuffer });
            }
        }

        // Register font if exists
        if (fontPath && fs.existsSync(fontPath)) {
            registerFont(fontPath, { family: 'CustomFont' });
        }

        // Create canvas for text
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Text settings
        const maxTextWidth = width * 0.8;
        let fontSize = 70;
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'center';
        ctx.font = `${fontSize}px CustomFont, sans-serif`;

        // Wrap text
        const words = text.split(' ');
        const lines: string[] = [];
        let line = '';

        for (const word of words) {
            const testLine = line ? line + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextWidth) {
                if (line) lines.push(line);
                line = word;
            } else {
                line = testLine;
            }
        }
        if (line) lines.push(line);

        // Adjust font size if too many lines
        while (lines.length * fontSize > height * 0.3 && fontSize > 10) {
            fontSize -= 2;
            ctx.font = `${fontSize}px CustomFont, sans-serif`;
            const newLines: string[] = [];
            line = '';
            for (const word of words) {
                const testLine = line ? line + ' ' + word : word;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxTextWidth) {
                    if (line) newLines.push(line);
                    line = word;
                } else {
                    line = testLine;
                }
            }
            if (line) newLines.push(line);
            lines.splice(0, lines.length, ...newLines);
        }

        // Draw text lines bottom-centered
        const lineHeight = fontSize * 1.2;
        let y = height - 50;
        for (let i = lines.length - 1; i >= 0; i--) {
            ctx.fillText(lines[i], width / 2, y);
            y -= lineHeight;
        }

        const textBuffer = canvas.toBuffer();

        // Composite all layers
        const compositeLayers = [
            { input: baseImage },
            ...layers,
            { input: textBuffer }
        ];

        // Create transparent background
        const finalImage = sharp({
            create: {
                width,
                height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            }
        })
            .composite(compositeLayers)
            .png();

        await finalImage.toFile(outputPath);

        return outputPath;
    }
}