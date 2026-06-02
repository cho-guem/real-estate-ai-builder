"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { AlertTriangle, Camera, FileUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UploadResponse = {
  ok: boolean;
  error?: string;
  receipt?: { id: string };
  contentType?: string;
};

export function ReceiptNewClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function startCamera() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저에서는 카메라 촬영을 지원하지 않습니다.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setCameraOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (event) {
      setError(
        event instanceof Error
          ? event.message
          : "카메라를 열지 못했습니다. 파일 업로드를 사용해 주세요."
      );
      setCameraOn(false);
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setError("카메라 화면이 준비되지 않았습니다.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("사진을 캡처하지 못했습니다.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );

    if (!blob) {
      setError("사진 파일을 만들지 못했습니다.");
      return;
    }

    const capturedFile = new File([blob], `receipt-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    setFile(capturedFile);
    setError("");
  }

  async function uploadAndAnalyze() {
    if (!file) return;
    setBusy(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/receipts/upload", {
        method: "POST",
        body: formData,
      });
      const uploadJson = (await uploadResponse.json()) as UploadResponse;

      if (!uploadResponse.ok || !uploadJson.ok || !uploadJson.receipt) {
        throw new Error(uploadJson.error ?? "업로드에 실패했습니다.");
      }

      const analyzeResponse = await fetch("/api/receipts/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptId: uploadJson.receipt.id,
          contentType: uploadJson.contentType ?? file.type,
        }),
      });
      const analyzeJson = (await analyzeResponse.json()) as { ok: boolean; error?: string };

      if (!analyzeResponse.ok || !analyzeJson.ok) {
        setError(
          analyzeJson.error ??
            "AI 분석에 실패했습니다. 검토 화면에서 수동으로 입력할 수 있습니다."
        );
      }

      router.push(`/receipts/${uploadJson.receipt.id}/review` as Route);
      router.refresh();
    } catch (event) {
      setError(event instanceof Error ? event.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 text-[17px] sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-primary">AI 입고 등록</p>
            <h1 className="mt-1 text-3xl font-bold tracking-normal">거래명세서 촬영</h1>
            <p className="mt-2 text-base text-muted-foreground">종이를 화면 안에 맞추고 촬영 버튼만 누르세요.</p>
          </div>
          <Button className="h-11 px-4 text-base" variant="outline" onClick={() => router.push("/receipts" as Route)}>
            목록
          </Button>
        </header>

        <section className="grid gap-2 rounded-lg border bg-primary/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
              1
            </span>
            <p className="font-semibold">카메라 켜기</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
              2
            </span>
            <p className="font-semibold">거래명세서 촬영</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
              3
            </span>
            <p className="font-semibold">사진 확인 후 AI 분석</p>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <div className="grid gap-4">
            <div className="overflow-hidden rounded-lg border bg-black">
              {cameraOn ? (
                <video
                  ref={videoRef}
                  className="aspect-[3/4] w-full object-cover sm:aspect-video"
                  muted
                  playsInline
                  autoPlay
                />
              ) : (
                <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 bg-muted/40 p-4 text-center sm:aspect-video">
                  <Camera className="size-12 text-primary" />
                  <div>
                    <p className="text-xl font-bold">여기에 종이를 맞춰 주세요</p>
                    <p className="mt-2 text-base text-muted-foreground">
                      글자가 잘 보이게 밝은 곳에서 촬영하면 좋습니다.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button className="h-14 text-lg font-bold" variant="outline" onClick={startCamera} disabled={busy}>
                <Camera />
                {cameraOn ? "다시 켜기" : "카메라 켜기"}
              </Button>
              <Button className="h-14 text-lg font-bold" onClick={capturePhoto} disabled={!cameraOn || busy}>
                <Sparkles />
                촬영
              </Button>
            </div>

            <details className="rounded-lg border bg-muted/20 p-3">
              <summary className="flex cursor-pointer items-center gap-2 text-base font-semibold">
                <FileUp className="size-4" />
                이미 찍어둔 사진이나 PDF 선택
              </summary>
              <Input
                className="mt-3 h-11 bg-background text-base"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </details>
          </div>
        </section>

        {file && (
          <section className="rounded-lg border bg-card p-4">
            <div className="mb-3 grid gap-3">
              <div className="min-w-0">
                <p className="text-xl font-bold">사진을 확인해 주세요</p>
                <p className="mt-1 text-base text-muted-foreground">글자가 흐리면 재촬영을 누르세요.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button className="h-14 text-base font-bold" variant="outline" disabled={busy} onClick={() => setFile(null)}>
                  <RotateCcw />
                  재촬영
                </Button>
                <Button className="h-14 text-base font-bold" disabled={busy} onClick={uploadAndAnalyze}>
                  {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  분석 시작
                </Button>
              </div>
            </div>
            {file.type === "application/pdf" ? (
              <iframe className="h-[520px] w-full rounded-lg border" src={previewUrl} title="PDF 미리보기" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="max-h-[520px] w-full rounded-lg object-contain" src={previewUrl} alt="거래명세서 미리보기" />
            )}
          </section>
        )}

        {error && (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-base font-medium text-destructive">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
