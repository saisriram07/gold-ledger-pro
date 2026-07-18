import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  value?: string | null;
  onChange: (path: string | null) => void;
  label?: string;
}

/**
 * Photo capture widget: takes a photo with the device camera (falls back to
 * file picker on desktop) or lets the user upload an image. The file is
 * uploaded to the private `customer-photos` bucket under the current user's
 * folder, and the storage path is stored in `value`. Signed URLs are used for
 * display so the private bucket remains locked down.
 */
export function PhotoCapture({ value, onChange, label = "Customer Photo" }: Props) {
  const { user } = useAuth();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("customer-photos").createSignedUrl(path, 3600);
    if (data?.signedUrl) setPreview(data.signedUrl);
  };

  // Load signed URL when value comes from parent
  if (value && !preview) {
    loadSignedUrl(value);
  }

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("customer-photos").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange(path);
    await loadSignedUrl(path);
  };

  const clear = () => {
    onChange(null);
    setPreview(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-start gap-3">
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Customer" className="h-24 w-24 object-cover rounded-md border" />
            <button
              type="button"
              onClick={clear}
              aria-label="Remove photo"
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="h-24 w-24 rounded-md border border-dashed flex items-center justify-center text-muted-foreground text-xs">
            No photo
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()} disabled={uploading}>
            <Camera className="h-4 w-4 mr-1" /> Camera
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>
        </div>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
    </div>
  );
}
