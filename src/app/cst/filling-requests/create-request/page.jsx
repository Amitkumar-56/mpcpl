import { Suspense } from 'react'
import CreateRequestForm from './CreateRequestForm'

export default function CreateRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading request form...</p>
        </div>
      </div>
    }>
      <CreateRequestForm />
    </Suspense>
  )
}