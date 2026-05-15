#!/bin/bash
set -e

# Cipher AI IDE - macOS Deployment Script (ARM64)
# Target: macOS 10.15+, Apple Silicon (M1/M2/M3)
# Bundle ID: com.aatifqmr.cipher

VERSION="1.0.0-beta.1"
RELEASE_TITLE="Cipher v$VERSION (Native AI IDE)"
TAG="v$VERSION"
PROJECT_DIR="terax-ai-0.6.1" # Using current directory name

cd $PROJECT_DIR

echo "🧹 1. Cleaning build environment..."
rm -rf dist src-tauri/target/aarch64-apple-darwin/release/bundle
cd src-tauri && cargo clean && cd ..

echo "🏗️ 2. Building Cipher for macOS ARM64..."
# Ensure dependencies are current
bun install
# Build production bundle
bun run tauri build --target aarch64-apple-darwin

DMG_FILE="src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Cipher_${VERSION}_aarch64.dmg"

if [ ! -f "$DMG_FILE" ]; then
    echo "❌ Error: DMG not found at $DMG_FILE"
    exit 1
fi

echo "🔐 3. Verifying binary integrity..."
SHA256=$(shasum -a 256 "$DMG_FILE" | awk '{print $1}')
echo "SHA256: $SHA256"
echo "$SHA256  Cipher_${VERSION}_aarch64.dmg" > checksums.txt

echo "📝 4. Preparing Changelog..."
cat > CHANGELOG.md <<EOF
## 🎉 Cipher v1.0.0-beta.1 - Initial Release
**The Native-First AI IDE for macOS.**

### ✨ Key Features
- **Ghost Text:** Real-time, context-aware code suggestions powered by Gemini Flash.
- **Time Travel:** Undo/redo any AI edit or chat state instantly via zstd-compressed snapshots.
- **Project Context (RAG):** Native Rust-based indexing (SQLite FTS5) for project-aware AI awareness.
- **Graphify:** Interactive dependency graphs and semantic code visualization.

### 🔐 Security & Core
- **Zero API Keys:** Full migration to Google OAuth 2.0 (PKCE).
- **Native Keychain:** Tokens are stored strictly in the macOS Keychain via the \`keyring\` crate.
- **Rebranded:** Fully migrated from Terax to Cipher (com.aatifqmr.cipher).
- **M1 Optimized:** Idle RAM usage <100MB.

### 📦 Installation
1. Download \`Cipher_${VERSION}_aarch64.dmg\`.
2. Drag **Cipher** to your Applications folder.
3. If the app is blocked by Apple on first launch (due to ad-hoc signing), run this in your terminal:
   \`\`\`bash
   sudo xattr -rd com.apple.quarantine /Applications/Cipher.app
   \`\`\`

---
Created with ❤️ by **Aatif-qmr**
EOF

echo "🏷️ 5. Updating Git Tag..."
git tag -d "$TAG" || true
git push origin :refs/tags/"$TAG" || true
git tag -a "$TAG" -m "Cipher $VERSION Official Release"
git push origin "$TAG"

echo "🚀 6. Creating GitHub Release..."
gh release create "$TAG" \
  --title "$RELEASE_TITLE" \
  --notes-file CHANGELOG.md \
  --prerelease \
  "$DMG_FILE" \
  checksums.txt || {
      echo "⚠️ Release creation failed. Check 'gh' authentication."
      exit 1
  }

echo "✅ Cipher v$VERSION successfully built and released to GitHub!"
echo "Verification: codesign -v -vvv --deep /Applications/Cipher.app"
