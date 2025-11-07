# Background Images

Place your background images in this folder.

## Image Requirements

- **Format:** JPG or PNG
- **Recommended Size:** 1080x1350px (4:5 aspect ratio for Instagram)
- **Note:** Images will be automatically resized to fit the canvas

## Naming Options

### Option 1: Single Background for All Slides
- `background.jpg` or `background.png`
- This image will be used for all slides

### Option 2: Different Backgrounds per Slide Type
- `background-hook.jpg` - For hook slides (first slide)
- `background-middle.jpg` - For middle content slides
- `background-cta.jpg` - For call-to-action slides (last slide)

## Priority Order

The system will look for images in this order:
1. `background-{slide-type}.jpg` (e.g., `background-hook.jpg`)
2. `background-{slide-type}.png`
3. `background.jpg` (fallback for all slides)
4. `background.png` (fallback for all slides)

If no image is found, slides will use a white background.

## Example

```
public/
└── backgrounds/
    ├── background-hook.jpg    # For hook slides
    ├── background-middle.jpg # For middle slides
    └── background-cta.jpg     # For CTA slides
```

Or simply:

```
public/
└── backgrounds/
    └── background.jpg        # For all slides
```

