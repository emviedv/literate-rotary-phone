# Debug Mode for ScaleResizer

## Enable Debug Mode

To see detailed information about how the plugin is scaling your content, you can enable debug mode:

1. Open Figma Developer Console (Plugins → Development → Show Console)
2. Run this command in the console:
   ```javascript
   figma.root.setPluginData("biblioscale:debug", "1")
   ```

## Disable Debug Mode

To turn off debug logging:
```javascript
figma.root.setPluginData("biblioscale:debug", "0")
```

## What Debug Mode Shows

When enabled, you'll see detailed logs including:
- Content analysis results (actual content bounds, density, strategy)
- Effective dimensions being used for scaling
- Calculated scale values and why they were chosen
- Layout profile detection (vertical/horizontal/square)
- Spacing distribution calculations
- Any edge cases detected

## Example Debug Output

```
[ScaleResizer] Content analysis complete {
  frameId: "123:456",
  frameName: "My Design",
  effectiveDimensions: "400×600",
  strategy: "adaptive",
  contentDensity: "normal",
  hasText: true,
  hasImages: false,
  actualBounds: { x: 20, y: 30, width: 360, height: 540 }
}

[ScaleResizer] Optimal scale calculated {
  scale: 1.78,
  sourceEffective: "360×540",
  target: "1080×1920",
  profile: "vertical",
  strategy: "adaptive"
}
```

This helps diagnose why content might not be scaling as expected.
