// app/[lang]/admin/layout.js
import Breadcrumbs from "@/components/navs/Breadcrumbs";

export default function AdminLayout({ children }) {
    return (
        <div className="mx-auto py-4">
            <Breadcrumbs />
            {children}
        </div>
    )
}