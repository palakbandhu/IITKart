# IITKart Assets

This folder contains all local image assets for the IITKart application.

## Files

### logo.svg
The main IITKart logo featuring:
- Shopping cart icon
- "IITKart" text in bold
- "Campus Delivery Hub" tagline
- Color scheme: #8B6F47 (brown/tan)

**Used in:**
- Authentication page
- Home page
- All interface headers
- Favicon (can be used)

### background.svg
Authentication page background with:
- Beige/cream base color (#F5F1E8)
- Subtle circular patterns
- Abstract wave shapes
- Opacity layers for depth

**Used in:**
- Login/Register page
- Forgot Password flow

### home-background.svg
Homepage background with campus theme:
- Gradient beige/cream colors
- Building silhouettes (representing campus buildings)
- Decorative circles
- Professional campus atmosphere

**Used in:**
- Landing/Home page

## Image Guidelines

### Format
All images are SVG format for:
- Scalability (looks good at any size)
- Small file size
- Easy to modify/customize
- Works great in modern browsers

### Colors
Main color palette used:
- Primary: `#8B6F47` (Brown/Tan)
- Light: `#F5F1E8` (Cream/Beige)
- Accent: `#D4C4A8` (Light Tan)
- Dark: `#5A4A3A` (Dark Brown)

### Customization

To customize these SVG files:
1. Open in any text editor
2. Modify colors by changing hex values
3. Adjust dimensions in viewBox attribute
4. Add/remove elements as needed

Example:
```svg
<!-- Change this -->
<rect fill="#8B6F47" ... />

<!-- To this -->
<rect fill="#YOUR_COLOR" ... />
```

## Product Images

Product images are NOT stored locally. They are loaded from:
- **Unsplash CDN**: `https://images.unsplash.com/...`

This is intentional because:
1. Reduces repository size
2. High-quality stock images
3. Fast CDN delivery
4. Easy to replace URLs

### To Use Local Product Images

If you want to use local product images instead:

1. Add your images to `/public/assets/products/`
2. Update `AppContext.tsx` product image URLs:

```typescript
// Change from:
image: 'https://images.unsplash.com/photo-...'

// To:
image: '/assets/products/sandwich.jpg'
```

## File Sizes

Current asset sizes:
- `logo.svg`: ~1 KB
- `background.svg`: ~1 KB
- `home-background.svg`: ~1 KB

Total: ~3 KB (very lightweight!)

## Browser Compatibility

SVG format is supported in:
- ✅ Chrome (all versions)
- ✅ Firefox (all versions)
- ✅ Safari (all versions)
- ✅ Edge (all versions)
- ✅ Opera (all versions)
- ✅ Mobile browsers (iOS, Android)

## License

These assets are part of the IITKart project and can be used freely within this project.

For commercial use outside this project, please create your own designs or use properly licensed images.
