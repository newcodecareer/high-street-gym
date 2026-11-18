import { useCallback } from "react"
import { API_BASE_URL } from "../api.mjs"
import { FaFileDownload } from "react-icons/fa"

/**
 * Download an XML export with the API key in the request header. A plain link
 * cannot set a header, so the response is fetched as a blob first.
 */
function XMLDownloadButton({ className = "btn btn-outline", children, route, authenticationKey = "", filename = "export.xml" }) {
    const download = useCallback(() => {
        fetch(API_BASE_URL + route, {
            method: "GET",
            headers: {
                "x-auth-key": authenticationKey,
            },
        })
            .then(response => {
                if (response.status == 200) {
                    response.blob()
                        .then(data => {
                            const link = document.createElement("a")
                            link.href = URL.createObjectURL(data)
                            link.setAttribute("download", filename)
                            document.body.appendChild(link)
                            link.click()
                            link.remove()
                            // Give the browser time to start the download.
                            setTimeout(() => URL.revokeObjectURL(link.href), 1000)
                        })
                } else {
                    response.json()
                        .then(body => {
                            console.error(body.message)
                        })
                }
            })
            .catch(error => {
                console.error("failed to download - " + error)
            })
    }, [route, authenticationKey, filename])

    return <button onClick={() => download()} className={className}>
        <FaFileDownload />
        {children}
    </button>
}

export default XMLDownloadButton
