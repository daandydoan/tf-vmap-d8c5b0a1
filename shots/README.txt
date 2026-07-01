Drop page screenshots here, one PNG per route, using these exact filenames.
The sitemap (../index.html) auto-loads each one and shows a placeholder until it exists.

  dashboard.png                 -> /dashboard
  tenders.png                   -> /tenders
  tender-details.png            -> /tenders/tender-details/<id>  (per-tender edit workspace)
  tender-build.png              -> /tenders/build-tender/<id>  (Build Tender attachment assembly)
  tender-ray.png                -> Open Ray panel on a tender detail page
  tenders-awarded.png           -> /tenders/awarded-tenders
  tenders-unsuccessful.png      -> /tenders/unsuccessful-tenders
  responses.png                 -> /responses
  responses-ai.png              -> /responses?folderId=ai  (AI Responses system folder)
  fm-cover-pages.png            -> /file-manager/cover-pages
  fm-toc.png                    -> /file-manager/table-of-contents
  fm-resumes.png                -> /file-manager/resumes
  fm-case-studies.png           -> /file-manager/case-studies
  fm-policies.png               -> /file-manager/policies
  fm-insurances.png             -> /file-manager/insurances
  fm-certifications.png         -> /file-manager/certifications
  fm-org-chart.png              -> /file-manager/organization-chart
  fm-others.png                 -> /file-manager/others
  staff-management.png          -> /manage-staff
  role-management.png           -> /manage-staff/role-management
  settings.png                  -> /settings
  ai-manager.png                -> /settings/ai-manager

Tip: in Chrome, open DevTools (F12) -> Cmd/Ctrl+Shift+P -> "Capture full size screenshot"
for a clean full-page image with no browser chrome. Then rename to the filename above.

PNG is expected. To use JPGs instead, change the `${src}` extension in index.html
(search for `shots/${p.file}.png`).
