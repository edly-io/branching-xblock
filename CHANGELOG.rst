Change Log
##########

..
   All enhancements and patches to branching_xblock will be documented
   in this file.  It adheres to the structure of https://keepachangelog.com/ ,
   but in reStructuredText instead of Markdown (for ease of incorporation into
   Sphinx documentation and the PyPI description).

   This project adheres to Semantic Versioning (https://semver.org/).

.. There should always be an "Unreleased" section for changes pending release.

Unreleased
**********

Added
=====

* Nodes have an optional plain-text title, shown as a heading above the content.
* Nodes have an optional outcome ("Good choice" or "Try again"). An outcome
  node shows a status mark and the learner's last choice, and a "Try again"
  node turns the Go Back button into "Back to the scenario".
* A node with a single choice shows it as one button instead of a radio list
  and a Submit button.
* ``XBLOCK_SETTINGS["BranchingXBlock"]["ISOLATE_STYLES"] = False`` renders the
  learner view in the page, without the shadow root and Paragon, for sites
  whose theme styles the block.

Changed
=======

* The learner's choices are recorded with scoring off too, so outcome nodes
  can show them.

Fixed
=====

* The block's Paragon styles no longer leak into the rest of the page and
  restyle other blocks in Studio and the LMS; the learner view now renders
  inside a Shadow DOM.

0.3.3 – 2026-09-21
**********************************************

Fixed
=====

* Branching choice labels are now included in the search index.

0.3.2 – 2026-08-18
**********************************************

Fixed
=====

* Node hints are now sanitized, Grade and completion events are no longer published outside a course run.

0.3.1 – 2026-07-31
**********************************************

Changed
=======

* Hardened search-index sanitization: HTML is now stripped with ``nh3``, dropping script/style contents, decoding entities, and keeping words in adjacent elements separated.

0.3.0 – 2026-07-21
**********************************************

Added
=====

* Content-search (Meilisearch) support: node content and image alt texts are indexed via ``index_dictionary``.

0.2.0 – 2026-04-28
******************

Added
=======

* Import/export functionality.

0.1.3 – 2026-03-12
******************

Changed
=======

* Refactor the Branching XBlock to support Ren'Py-like flow features.
* Replace hint settings with a reset option.
* Update styling and related tests.

0.1.0 – 2025-04-15
**********************************************

Added
=====

* First release on PyPI.
