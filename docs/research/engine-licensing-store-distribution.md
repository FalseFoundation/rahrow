# Engine licensing and store distribution

Research date: 2026-08-28

This note records engineering and release-planning conclusions from primary
sources. It is not legal advice. Copyright scope, whether a particular binary is
a derivative or combined work, and whether store terms create an unresolvable
license conflict require review by qualified open-source and distribution counsel
before RahRow ships.

## Decision summary

RahRow should keep the repository's first-party source under MIT for now, but it
must not describe every distributable as "MIT licensed." The license set and
corresponding-source obligations depend on the components and how they are
combined in each artifact.

The conservative release model is:

| Distribution | Recommended engine posture before legal approval |
| --- | --- |
| Windows and Linux direct packages | Bundle pinned Xray and sing-box as separate supervised executables, not linked libraries. Treat the installer/package as an aggregate only after counsel confirms that the process and configuration boundary is sufficient. Publish the exact sing-box Corresponding Source, GPL text and additional term beside every release. |
| macOS direct Developer ID | Prefer Xray/libXray only for the first native Network Extension release. A libbox provider is a linked combined work and needs a GPL release plan, Installation Information analysis, and counsel approval. |
| macOS App Store | Ship Xray/libXray only unless counsel approves a custom-EULA and GPL compliance plan. Do not include libbox merely because upstream can build an XCFramework. |
| iOS App Store | Ship Xray/libXray only. Keep sing-box unavailable until its copyright holders grant an applicable store exception or qualified counsel approves a concrete GPL/store/signing model. |
| Android Google Play | Ship Xray/libXray only initially. A libbox AAR is linked into the app; enabling it requires treating the combined distributed work as GPL-compatible, publishing complete Corresponding Source and build/install material, and resolving Play terms with counsel. |
| Direct Android APK or a free-software repository | Potential later sing-box channel if the complete combined app is distributed under GPL-compatible terms with Corresponding Source and Installation Information. This still needs counsel and must not be assumed to cure obligations attached to a separate Play distribution. |

This is deliberately stricter than the technically available engine matrix. An
upstream native build target is not permission to distribute that target through
every channel.

## Sourced facts

### sing-box and libbox

The sing-box repository states GPL version 3 or, at the recipient's option, any
later version. Its license notice adds that a derivative work may not use the name
or imply association without prior consent
([pinned sing-box license notice](https://github.com/SagerNet/sing-box/blob/v1.13.19/LICENSE)).
The restriction resembles the kinds of origin, publicity and trademark conditions
listed as permitted additional terms by GPLv3 section 7, but counsel should confirm
that interpretation. RahRow must retain the upstream notice and must not imply
SagerNet endorsement.

`experimental/libbox` is source inside the same sing-box repository, not a
separately licensed SDK. Upstream's build tool passes that package to `gomobile
bind` to produce Android AAR and Apple framework artifacts
([official libbox build implementation](https://github.com/SagerNet/sing-box/blob/testing/cmd/internal/build_libbox/main.go),
[libbox platform interface](https://github.com/SagerNet/sing-box/blob/testing/experimental/libbox/platform.go)).
No separate libbox exception or permissive license was found in the upstream
source reviewed for this note.

GPLv3 section 5 requires a covered combined work to be licensed as a whole under
GPLv3, while its aggregate clause says that placing separate and independent works
on one distribution medium does not extend the GPL to those other works. Section
6 permits object-code distribution only with one of its specified Corresponding
Source mechanisms. Section 10 says a conveyor may not impose further restrictions
on recipients' exercise of GPL rights
([GPLv3 text](https://www.gnu.org/licenses/gpl-3.0.html)).

The Free Software Foundation's GPL FAQ says separate programs installed on one
system do not need compatible licenses merely for that reason, but also says that
linking and intimate communication can form a single combined program. It
describes simple `fork`/`exec` interaction as evidence of separation, not an
automatic legal safe harbor
([GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html#WhatIsCompatible)).

### Xray-core and libXray

Xray-core identifies its license as MPL-2.0
([Xray-core repository](https://github.com/XTLS/Xray-core),
[pinned Xray-core license](https://github.com/XTLS/Xray-core/blob/v26.7.28/LICENSE)). MPL
2.0 is file-level copyleft: distributed Covered Software in Source Code Form and
modifications remain under MPL, while a Larger Work can contain separate files
under other terms. When distributing Executable Form, section 3.2 requires the
Covered Software's Source Code Form to be available and recipients to be told how
to obtain it by reasonable means in a timely manner
([MPL 2.0 sections 1 and 3](https://www.mozilla.org/en-US/MPL/2.0/)).

libXray describes itself as an Xray-core wrapper for mobile and desktop, publishes
Android and Apple build paths, pins Xray-core through its Go module graph, and
states that the wrapper repository is MIT licensed
([libXray README](https://github.com/XTLS/libXray/blob/main/README.md),
[libXray license](https://github.com/XTLS/libXray/blob/v26.7.28/LICENSE)). The MIT
wrapper does not replace or erase Xray-core's MPL obligations. A release must
inventory and satisfy both sets of notices and the exact transitive dependency
licenses produced by the pinned build.

### RahRow's MIT license

RahRow's root `LICENSE` is the MIT license and requires its copyright and
permission notice in copies or substantial portions. MIT permits modification,
distribution and sublicensing. The FSF classifies permissive licenses in this
family as GPL-compatible, but compatibility means a combined distributed work can
be placed under the GPL; it does not mean GPL requirements disappear
([GNU license compatibility explanation](https://www.gnu.org/licenses/license-compatibility.html),
[GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html#WhatDoesCompatMean)).

Accordingly, first-party source files can retain MIT notices. If counsel concludes
that a RahRow application linked with libbox is one combined work, the distributed
combination must also grant recipients the applicable GPL rights. A package label
or store listing that says only "MIT" would be incomplete.

### Wintun

The official Wintun site says the only supported redistributable binaries are the
signed DLLs from its ZIP archive, and publishes the archive checksum. It contrasts
those prebuilt binaries with the GPL-2.0 source repository
([Wintun download](https://www.wintun.net/),
[Wintun repository guidance](https://git.zx2c4.com/wintun/about/?h=0.14.1)).

The prebuilt-binary license defines the Software as the precise `wintun.dll` files
inside the downloaded ZIP. It prohibits modification, reverse engineering,
removing notices, and general redistribution, but permits distributing the DLL
alongside other software that uses it only through the permitted `wintun.h` API.
It also prohibits using WireGuard or Wintun names to imply endorsement
([official prebuilt-binary license](https://git.zx2c4.com/wintun/tree/prebuilt-binaries-license.txt)).

RahRow must therefore use the untouched architecture-correct official DLL, preserve
its included license/notices, record the ZIP and DLL hashes, and distribute it only
with the Windows software that invokes the permitted API. It should never rebuild,
rename or separately mirror an unofficial Wintun driver under the prebuilt license.

### Apple App Store terms

Apple says the English agreement accepted in the developer account is binding and
most current, so the account holder must archive the exact accepted agreement for
each release
([Apple agreements and guidelines](https://developer.apple.com/support/terms/)).
The public Standard EULA grants a nontransferable license and generally prohibits
transfer, redistribution and sublicensing. Its reverse-engineering and modification
restriction contains an exception where open-source component licenses permit
those acts, but the redistribution language does not state the same broad exception
([Apple Standard EULA](https://www.apple.com/legal/internet-services/itunes/dev/stdeula/)).
Apple's minimum custom-EULA terms also require the app-use license to be
nontransferable and consistent with Apple usage rules
([Apple minimum EULA terms](https://www.apple.com/legal/internet-services/itunes/dev/minterms/)).

Apple's review guidelines require the submitter to own or have licensed all
included intellectual property
([App Review Guideline 5.2](https://developer.apple.com/app-store/review/guidelines/#intellectual-property)).
These facts create a real issue to resolve against GPLv3 section 10's ban on
further restrictions and, for relevant User Products, section 6's Installation
Information requirement. This note does not decide whether an Apple custom EULA,
the open-source exception, source distribution through another channel, or a
particular signing design is legally sufficient.

### Google Play terms

The Google Play Developer Distribution Agreement authorizes Google to reproduce
and use submitted products for operating and marketing Play. Section 5.3 grants
users a nonexclusive, worldwide, perpetual license to perform, display and use the
product. Section 5.3 also allows a separate developer EULA but says the Play
agreement supersedes it on conflict. Sections 11.1 and 11.2 require the developer to hold the
rights needed for the product and included third-party material
([Google Play Developer Distribution Agreement](https://play.google.com/intl/ALL_us/about/developer-distribution-agreement.html)).

The public agreement does not itself grant users the GPL rights to copy, modify
and redistribute a GPL-covered work. RahRow would need to supply those rights and
all GPL materials itself, then have counsel determine whether any Play terms,
technical controls, account terms or signing/update requirements impose a further
restriction. Google Play availability is therefore not proof of GPL compliance.

## Inferences requiring counsel confirmation

The following are release-planning inferences, not sourced legal conclusions:

1. A separately launched, unmodified sing-box executable controlled through files,
   arguments and ordinary process lifecycle has the strongest argument for being a
   separate work in an aggregate with the MIT RahRow app. A native libbox AAR or
   XCFramework linked into an app has the strongest argument for being a combined
   work governed as a whole by GPLv3-or-later.
2. Keeping source files under MIT is compatible with distributing a particular
   combined app under GPL terms, because MIT grants broad sublicensing rights. It
   still requires retaining RahRow's MIT notice and does not authorize relicensing
   third-party code beyond its own terms.
3. Xray/libXray is the lower-risk initial mobile combination: the wrapper is MIT
   and Xray-core's MPL copyleft is scoped to Covered Software files. This does not
   eliminate source, notice, dependency, export-control, patent, trademark, Apple,
   Google, or signing review.
4. Publishing source on GitHub is not by itself enough. Each binary release must
   point to an immutable source bundle matching that exact artifact, and the bundle
   must contain everything the applicable license defines as source or build and
   installation material.
5. An alternate direct GPL-compliant download does not automatically neutralize
   restrictions attached to copies conveyed through an app store. Each conveyance
   must be reviewed independently.

## Release evidence and compliance controls

GPL and MPL require source availability and notices as described above. Neither
license text expressly requires an SBOM named "SBOM" or a reproducible-build
manifest. RahRow should nevertheless require both as evidence that it shipped the
reviewed inputs. SPDX is an international SBOM standard (ISO/IEC 5962:2021)
([SPDX specifications](https://spdx.dev/use/specifications/)).

Every platform artifact should have an immutable release record containing:

- RahRow commit, dirty-tree status, package lockfile hash, build workflow revision,
  builder image/toolchain versions, target OS/architecture and signing identity
  reference;
- each engine's upstream repository, tag and full commit, archive/source-bundle
  URL and SHA-256, Go version, build tags, linker/compiler flags, patches and
  generated native wrapper revision;
- final unsigned and signed artifact hashes, with signatures/provenance stored as
  separate release evidence rather than replacing the unsigned checksum;
- an SPDX SBOM for the shipped artifact, including native Go modules, Rust crates,
  Java/Kotlin or Swift dependencies, JavaScript packages, driver components,
  license expressions and package relationships;
- `THIRD_PARTY_NOTICES`, complete applicable license texts, RahRow's MIT notice,
  sing-box's additional name/association term, Xray-core MPL notice, libXray MIT
  notice, Wintun prebuilt license, and notices for every transitive dependency;
- a stable in-app and release-page route from each executable to its notices and
  exact source offer/location.

For a sing-box object-code release, publish a versioned Corresponding Source bundle
at no charge using a GPLv3 section 6 method appropriate to the distribution. It
should include the exact sing-box/libbox source, RahRow source that counsel places
inside the covered combined work, dependency source not excluded as System
Libraries, interface definitions, patches, build scripts, toolchain inputs needed
to generate/install/run it, and Installation Information when section 6 requires
it. Keep the offer/location available for the required term chosen under section 6;
do not rely on a moving branch or an upstream repository that can disappear.

For an Xray executable or libXray artifact, publish the exact Xray-core Covered
Source and RahRow modifications under MPL-2.0 and tell executable recipients where
to obtain it. Retain MPL and MIT notices. A pristine upstream URL may be part of
the delivery mechanism, but RahRow should also archive the exact source snapshot
and patches under its control.

For Wintun, archive the exact official ZIP as release evidence, verify the upstream
published ZIP checksum and the selected DLL checksum, preserve the bundled license,
and copy the untouched DLL into the installer only for software using `wintun.h`.

## Approval gate

Do not enable sing-box/libbox in Android, iOS or macOS native release artifacts and
do not advertise dual-engine mobile support until qualified counsel provides a
written answer for the exact linking, source, Installation Information, signing,
EULA and store-distribution design. Counsel should separately approve:

1. direct Windows/Linux sidecar aggregation;
2. direct Developer ID macOS distribution;
3. Apple App Store distribution and the exact custom or standard EULA;
4. Google Play distribution and any alternate APK channel;
5. treatment and preservation of sing-box's additional term; and
6. the source-offer retention period, artifact contents and contributor licensing
   needed if a combined RahRow/libbox application is distributed under GPL terms.

Until that review is complete, the licensing Taskset item remains a release blocker.
