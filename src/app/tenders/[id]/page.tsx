// The canonical tender URL uses the server-rendered opportunity detail
// implementation. Keeping one implementation prevents metadata and page
// content from drifting between the legacy and canonical routes.
export { default, generateMetadata, revalidate } from "@/app/opportunities/[id]/page"
