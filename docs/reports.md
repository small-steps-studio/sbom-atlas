# Reports

Every report reads the text of the active editor and opens its result as a new Markdown document. Your file is never changed and nothing is sent anywhere. The examples below come from the sample file (Open Sample File).

## Show Summary

Command: **SBOM Atlas: Show Summary**

Shows the format (CycloneDX or SPDX) and version of the SBOM, the product or document it describes, the number of components, how many of them carry a version, a license and a package URL, and how the components split over package ecosystems such as npm, PyPI and Maven (taken from the package URLs).

Example (sample file):

> # SBOM Summary
>
> CycloneDX 1.5 SBOM for orders-portal 3.2.0.
>
> 14 components.
>
> 13 with a version, 14 with a license, 13 with a package URL.
>
> | Ecosystem | Components |
> |---|---|
> | npm | 8 |
> | maven | 2 |
> | (none) | 1 |
> | cargo | 1 |
> | golang | 1 |
> | pypi | 1 |

## Show Components

Command: **SBOM Atlas: Show Components**

Lists every component, nested CycloneDX components included, with its version, type, licenses and package URL, sorted by name and version (2 before 10). A CycloneDX group is shown in front of the name (@scope/name, or group:name). Very large SBOMs show the first 1000 components and say how many there are.

Example (sample file):

> # Components
>
> 14 components.
>
> | Name | Version | Type | Licenses | PURL |
> |---|---|---|---|---|
> | @acme-ui/button | 3.1.0 | library | MIT | pkg:npm/%40acme-ui/button@3.1.0 |
> | barcode-print | 2.2.0 | library | Example Vendor Commercial Licence | pkg:npm/barcode-print@2.2.0 |
> | chart-lines | 5.1.0 | library | MIT OR GPL-3.0-only | pkg:npm/chart-lines@5.1.0 |
> | date-kit | 2.29.1 | library | MIT | pkg:npm/date-kit@2.29.1 |
> | date-kit | 2.30.0 | library | MIT | pkg:npm/date-kit@2.30.0 |
> | fast-csv-reader | 1.4.2 | library | BSD-3-Clause | pkg:pypi/fast-csv-reader@1.4.2 |
> | geo-index | 0.9.4 | library | LGPL-2.1-or-later | pkg:cargo/geo-index@0.9.4 |
> | http-retry | 1.8.3 | library | Apache-2.0 | pkg:golang/example.test/http-retry@1.8.3 |
> | image-shrink |  | library | GPL-2.0-only | pkg:npm/image-shrink |
> | json-schema-lite | 0.4.0 | library | MPL-2.0 |  |
> | org.example:font-subset | 1.2.0 | library | Apache-2.0 AND GPL-2.0-only WITH Classpath-exception-2.0 | pkg:maven/org.example/font-subset@1.2.0 |
> | org.example:pdf-forms | 7.0.1 | library | AGPL-3.0-only | pkg:maven/org.example/pdf-forms@7.0.1 |
> | tidy-router | 3.9.0 | library | MIT | pkg:npm/tidy-router@3.9.0 |
> | tidy-router | 4.2.1 | library | MIT | pkg:npm/tidy-router@4.2.1 |

## Show Duplicate Components

Command: **SBOM Atlas: Show Duplicate Components**

Lists every component name that appears with two or more different versions, with all its versions; components without a version are not counted, and a CycloneDX group is part of the name, so @babel/core and @angular/core stay apart. Several versions of one library often mean an extra download size and a version that misses a security fix.

Example (sample file):

> # Duplicate Components
>
> 2 components with several versions.
>
> | Name | Versions |
> |---|---|
> | date-kit | 2.29.1, 2.30.0 |
> | tidy-router | 3.9.0, 4.2.1 |

## Show License Risk (Pro)

Command: **SBOM Atlas: Show License Risk** (Pro; part of the 14-day trial)

Sorts every component by its license into permissive, weak copyleft, strong copyleft and unknown, using the SPDX license identifiers in the SBOM. License expressions are read as SPDX defines them: parentheses are respected, AND binds tighter than OR, and 'X WITH exception' counts as X. With OR the least restrictive choice counts, with AND the most restrictive part; a component with several licenses counts as the most restrictive of them, and a malformed expression is rated unknown. The components with a strong copyleft or an unknown license are listed for review. This is a first sorting, not legal advice.

Example (sample file):

> # License Risk
>
> | Category | Components |
> |---|---|
> | permissive | 8 |
> | weak copyleft | 2 |
> | strong copyleft | 3 |
> | unknown | 1 |
>
> ## Needs review
>
> | Name | Version | Licenses | Category |
> |---|---|---|---|
> | barcode-print | 2.2.0 | Example Vendor Commercial Licence | unknown |
> | image-shrink |  | GPL-2.0-only | strong copyleft |
> | org.example:font-subset | 1.2.0 | Apache-2.0 AND GPL-2.0-only WITH Classpath-exception-2.0 | strong copyleft |
> | org.example:pdf-forms | 7.0.1 | AGPL-3.0-only | strong copyleft |

## Show NTIA Minimum Elements (Pro)

Command: **SBOM Atlas: Show NTIA Minimum Elements** (Pro; part of the 14-day trial)

Checks the minimum elements for an SBOM described by the NTIA: the author of the SBOM data, the timestamp and the dependency relationships for the document, and the supplier name, component name, version and a unique identifier (package URL or CPE) for each component, with how many components lack each one. In a CycloneDX file the author counts when metadata.authors lists someone, when metadata.manufacture, manufacturer or supplier has a name, or when the file names the tool that created it (metadata.tools as a list, or as an object with components or services). In an SPDX file it counts when creationInfo.creators is not empty. SPDX relationships of the types DEPENDS_ON, DEPENDENCY_OF, CONTAINS, CONTAINED_BY, the RUNTIME, BUILD, DEV, OPTIONAL, PROVIDED and TEST dependency types, DEPENDENCY_MANIFEST_OF, STATIC_LINK and DYNAMIC_LINK count as dependency relationships.

Example (sample file):

> # NTIA Minimum Elements
>
> | Document element | Present |
> |---|---|
> | Author of SBOM data | yes |
> | Timestamp | yes |
> | Dependency relationships | yes |
>
> | Component element | Present | Missing |
> |---|---|---|
> | Supplier name | 10 | 4 |
> | Component name | 14 | 0 |
> | Version | 13 | 1 |
> | Unique identifier | 13 | 1 |
>
> 4 of 7 minimum elements fully covered.
