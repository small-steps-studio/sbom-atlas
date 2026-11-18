# Troubleshooting

## The report says the file is not valid

SBOM Atlas reads the JSON formats of CycloneDX (bomFormat "CycloneDX") and SPDX (spdxVersion). XML SBOMs and SPDX tag-value files are recognised and reported as not supported; convert them to JSON with your SBOM tool first. A byte order mark at the start of the file is accepted.

## The file is too large

Reports read files up to the size set in `sbomAtlas.maxFileSizeMB` (50 MB by default and at most). VS Code passes files only up to 50 MB to extensions, so a larger file cannot be read by any extension: split it, or save a shorter one.

## The preview does not open

The report always opens as a Markdown document. If the preview stays closed, set `sbomAtlas.openReportsAsPreview` to true and check that the built-in Markdown extension is enabled.

## Pro or the trial does not unlock

Run **SBOM Atlas: Show Licence Status**. It tells whether a key is stored, whether it was checked, and how many trial days are left. Details are in [licence.md](licence.md).

## Something else

Run **SBOM Atlas: Report A Problem**. It copies a diagnostics block (versions, settings, licence state; no file contents) and opens the issues page.
