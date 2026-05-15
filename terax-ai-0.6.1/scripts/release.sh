#!/bin/bash
set -e

# Cipher AI Release Automation Script
# Version: 1.0.0-beta.1

VERSION="1.0.0-beta.1"
RELEASE_TITLE="Cipher AI v$VERSION: The Native-First AI IDE"
TAG="v$VERSION"

echo "🚀 Starting release process for Cipher AI $VERSION..."

# 1. Generate Changelog
echo "📝 Generating changelog from git history..."
echo "## 🔥 New Features" > RELEASE_NOTES.md
git log --pretty=format:"- %s" | grep "feat" | head -n 15 >> RELEASE_NOTES.md || true
echo -e "\n## 🔐 Security & Core" >> RELEASE_NOTES.md
git log --pretty=format:"- %s" | grep -E "fix|refactor|chore" | head -n 10 >> RELEASE_NOTES.md || true
echo -e "\n## ⚡ Performance" >> RELEASE_NOTES.md
git log --pretty=format:"- %s" | grep "perf" | head -n 5 >> RELEASE_NOTES.md || true

echo -e "\n## 📦 Installation Instructions" >> RELEASE_NOTES.md
echo "### macOS" >> RELEASE_NOTES.md
echo "Download the \`.dmg\` file and drag Cipher to your Applications folder. If the app is blocked by Apple, run \`xattr -cr /Applications/Cipher.app\` in your terminal." >> RELEASE_NOTES.md
echo "### Windows" >> RELEASE_NOTES.md
echo "Run the \`.msi\` installer. Requires Windows 10 or 11." >> RELEASE_NOTES.md
echo "### Linux" >> RELEASE_NOTES.md
echo "Download the \`.AppImage\`, make it executable (\`chmod +x Cipher.AppImage\`), and run it." >> RELEASE_NOTES.md

# 2. Build Production Binaries
echo "🏗️ Building production binaries via Tauri..."
# Note: For universal build, use --target universal-apple-darwin on Mac
# Here we build for the current host architecture.
bun run tauri build

# 3. Verify Assets
BUNDLE_DIR="src-tauri/target/release/bundle"
echo "🔍 Verifying generated assets in $BUNDLE_DIR..."
ls -R $BUNDLE_DIR

# 4. Create GitHub Release
echo "📤 Creating GitHub Release and uploading assets..."
# Check if tag exists locally, if not create it (though plan says it should exist)
if ! git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "Creating tag $TAG..."
    git tag -a "$TAG" -m "Release $TAG"
    git push origin "$TAG"
fi

# Use GitHub CLI to create the release
gh release create "$TAG" \
    --title "$RELEASE_TITLE" \
    --notes-file RELEASE_NOTES.md \
    --prerelease \
    $BUNDLE_DIR/dmg/*.dmg \
    $BUNDLE_DIR/msi/*.msi \
    $BUNDLE_DIR/appimage/*.AppImage || {
        echo "⚠️ Release creation failed. Ensure 'gh' is authenticated and repo is correct."
        exit 1
    }

echo "✅ Release $VERSION successfully published to GitHub!"
