# Laravel Shadcn Admin Dashboard

Template admin/CRUD berbasis **Laravel 13**, **React 19 / Inertia 3**, **Tailwind CSS 4**, dan shadcn/ui. Panduan ini menjelaskan starter dan komponen yang tersedia; bukan klaim bahwa seluruh halaman contoh merupakan modul bisnis siap produksi.

## Daftar isi

- [Cakupan dan peta proyek](#cakupan-dan-peta-proyek)
- [Mulai lokal](#mulai-lokal)
- [Verifikasi dan scripts](#verifikasi-dan-scripts)
- [Adopsi dengan pola reuse-first](#adopsi-dengan-pola-reuse-first)
- [Komposisi halaman dan modal](#komposisi-halaman-dan-modal)
- [Data table](#data-table)
- [Field shells](#field-shells)
- [Helper, formatter, dan hooks](#helper-formatter-dan-hooks)
- [Docker (konfigurasi tersedia)](#docker-konfigurasi-tersedia)
- [Checklist adopsi dan batasan](#checklist-adopsi-dan-batasan)
- [Lisensi](#lisensi)

## Cakupan dan peta proyek

Starter ini menyediakan fondasi Laravel/Inertia, autentikasi yang dikonfigurasi melalui Fortify, layout, UI primitives, beberapa shell reusable, dan contoh dashboard/menu/halaman. Dashboard, menu, maupun halaman yang memakai data statis atau dummy adalah **demo UI**, bukan implementasi domain produksi yang otomatis menyediakan model, kebijakan akses, workflow, API, validasi server, atau data bisnis.

Gunakan komponen reusable setelah memeriksa kontrak source dan contoh konsumen. Alias `@/` menunjuk ke `resources/js/`.

| Area                         | Lokasi                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Halaman Inertia              | [`resources/js/pages/`](resources/js/pages)                                          |
| UI primitives dan modal      | [`resources/js/components/ui/`](resources/js/components/ui)                          |
| Shell halaman admin          | [`secondary-page-shell.tsx`](resources/js/components/admin/secondary-page-shell.tsx) |
| Field shells (barrel publik) | [`form-inputs/index.ts`](resources/js/components/form-inputs/index.ts)               |
| Table shell dan pendukung    | [`resources/js/components/data-table/`](resources/js/components/data-table)          |
| Hooks                        | [`resources/js/hooks/`](resources/js/hooks)                                          |
| Helper                       | [`resources/js/lib/`](resources/js/lib)                                              |

Fondasi autentikasi tidak sama dengan otorisasi per-domain: pastikan setiap endpoint dan aksi memiliki policy/authorization dan validasi server yang sesuai.

## Mulai lokal

Constraint platform root Composer adalah PHP `^8.3`, tetapi untuk menjalankan `composer install` dengan `composer.lock` saat ini diperlukan PHP setidaknya 8.4.1 (beberapa paket Symfony yang terkunci mensyaratkan versi tersebut). Persyaratan Node.js dari lockfile adalah `^20.19.0 || >=22.12.0` (constraint Vite dan plugin React; Node 22.12+ pilihan yang praktis), serta Composer dan npm. Gunakan lockfile, jangan mengganti ke instalasi versi bebas.

Contoh setup untuk **database lokal/dev milik Anda**:

```bash
composer install
npm ci
cp .env.example .env
```

Atur `.env` lokal seperlunya, lalu siapkan kunci dan SQLite. `.env.example` memakai `DB_CONNECTION=sqlite`; `database/database.sqlite` mungkin belum tersedia:

```bash
php artisan key:generate
mkdir -p database
touch database/database.sqlite
php artisan migrate
npm run build
php artisan serve
```

Alternatif selama pengembangan frontend: jalankan `npm run dev` di terminal terpisah bersama server Laravel. URL default konfigurasi lokal adalah `http://localhost:8000`.

**Peringatan:** `key:generate` mengubah `.env`; migrasi mengubah database yang dikonfigurasi. Jangan salin/perintahkan setup ini begitu saja terhadap `.env`, database, atau lingkungan produksi. Backup dan ikuti prosedur deployment/migrasi yang disetujui untuk lingkungan nyata. Setup lokal di atas bukan panduan deployment.

## Verifikasi dan scripts

Script yang tersedia di `package.json` dan `composer.json`:

| Perintah                | Efek/cakupan                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run build`         | Membuat production bundle Vite di `public/build`.                                                                 |
| `npm run dev`           | Menjalankan Vite dev server/hot reload.                                                                           |
| `npm run types:check`   | TypeScript (`tsc --noEmit`) saja.                                                                                 |
| `npm run test:frontend` | Menjalankan tes frontend Node di `tests/Frontend/*.test.mjs`. Tidak otomatis dijalankan oleh `composer ci:check`. |
| `npm run lint:check`    | ESLint tanpa auto-fix.                                                                                            |
| `npm run lint`          | ESLint dengan `--fix`; **mengubah file**.                                                                         |
| `npm run format:check`  | Prettier check untuk `resources/` saja.                                                                           |
| `npm run format`        | Prettier menulis ulang `resources/`; **mengubah file**.                                                           |
| `composer types:check`  | PHPStan, bukan TypeScript.                                                                                        |
| `composer lint:check`   | Pint check saja.                                                                                                  |
| `composer lint`         | Pint formatting.                                                                                                  |
| `composer test`         | Config clear, Pint check, PHPStan, PHPUnit.                                                                       |
| `composer ci:check`     | lint:check, format:check, types:check, dan test; tidak memanggil `npm run test:frontend`.                         |

Contoh pemeriksaan tanpa auto-fix:

```bash
npm run types:check
npm run test:frontend
npm run lint:check
npm run format:check
composer ci:check
```

Pilih pemeriksaan sesuai perubahan; `composer ci:check` lebih luas dan memerlukan dependensi PHP tersedia. Periksa isi script sebelum menjalankan perintah pada workspace bersama. Tidak ada script `test` npm atau `composer test:frontend`; tes frontend hanya perintah `npm run test:frontend`.

## Adopsi dengan pola reuse-first

1. Cari implementasi/consumer yang sudah ada berdasarkan perilaku, bukan hanya nama komponen.
2. Reuse primitive, lalu komposisikan shell yang sesuai; bila perluas kontrak opsional, jaga kompatibilitas konsumen lama.
3. Buat helper/komponen baru hanya jika kebutuhan berbeda secara nyata dan tidak wajar dicapai lewat komposisi/ekstensi.
4. Pisahkan demo dari domain baru. Bentuk route, data, validasi, kebijakan akses, dan persistence mengikuti implementasi aplikasi Anda; contoh di bawah memakai data/callback caller, bukan endpoint bawaan template.

Lihat [Field shells](#field-shells), [Data table](#data-table), serta peta helper di [AGENTS.md](AGENTS.md) untuk aturan kerja repository.

## Komposisi halaman dan modal

`SecondaryPageShell` adalah **default export** dari `@/components/admin/secondary-page-shell`. Props wajib: `title`, `backHref`, `children`; opsional `description`, `backLabel`, `actions`, `footerActions`. Tautan kembali berupa string URL.

```tsx
import SecondaryPageShell from '@/components/admin/secondary-page-shell';
import { Button } from '@/components/ui/button';

export function ExamplePage({ onCreate }: { onCreate: () => void }) {
    return (
        <SecondaryPageShell
            title="Daftar contoh"
            description="Kelola data domain milik aplikasi."
            backHref="/"
            actions={
                <Button type="button" onClick={onCreate}>
                    Tambah
                </Button>
            }
        >
            <section>Konten halaman milik pemanggil</section>
        </SecondaryPageShell>
    );
}
```

`ModalShell` adalah **default export** `@/components/ui/modal-shell`; ia membungkus `DialogContent`, bukan dialog state/trigger atau form. Komposisikan dengan `Dialog` dan primitive header/title/description/footer yang bernama dari `@/components/ui/dialog`. State buka/tutup, tombol trigger, data form, submit, request, dan otorisasi tetap milik pemanggil.

```tsx
import { useState } from 'react';
import { TextInputShell } from '@/components/form-inputs';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import ModalShell from '@/components/ui/modal-shell';

export function ExampleModal({ onSave }: { onSave: (name: string) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onSave(name);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button type="button" onClick={() => setOpen(true)}>
                Buka
            </Button>
            <ModalShell size="medium">
                <DialogHeader>
                    <DialogTitle>Contoh</DialogTitle>
                    <DialogDescription>
                        Isi data untuk aksi caller.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit}>
                    <TextInputShell
                        label="Nama"
                        mode="create"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit">Simpan</Button>
                    </DialogFooter>
                </form>
            </ModalShell>
        </Dialog>
    );
}
```

Ukuran valid: `small` (default), `medium`, `large`, `extra-large`. Kelas ukuran memakai breakpoint `lg`: masing-masing `lg:max-w-sm`, `lg:max-w-[35vw]`, `lg:max-w-[60vw]`, `lg:max-w-[85vw]`. Semua ukuran di bawah `lg` memakai batas lebar viewport dikurangi 2rem (shell mengganti batas `sm:max-w-sm` primitive), dengan tinggi maksimal `calc(100dvh - 2rem)` dan scroll vertikal. Ini bukan jaminan layout cocok untuk semua konten—uji di aplikasi Anda.

## Data table

`DataTableShell` adalah **default export** `@/components/data-table/data-table-shell`. API generik meminta `data: Row[]`, `columns: DataTableColumn<Row>[]` (`id`, `header`, `cell(row,index)`; optional class), `getRowKey(row)` (string/number), dan `emptyState: ReactNode`. `toolbar`, `selection`, `rowActions`, `pagination`, serta class styling opsional. Source: [shell](resources/js/components/data-table/data-table-shell.tsx), [toolbar](resources/js/components/data-table/data-table-toolbar.tsx), [pagination](resources/js/components/data-table/data-table-pagination.tsx), [empty state](resources/js/components/data-table/data-table-empty-state.tsx), [row action menu](resources/js/components/data-table/data-table-row-actions.tsx).

Contoh bertipe ini memakai endpoint/callback yang disediakan pemanggil, bukan route template:

```tsx
import { useState } from 'react';
import DataTableShell from '@/components/data-table/data-table-shell';
import type { DataTableColumn } from '@/components/data-table/data-table-shell';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

type RecordRow = { id: number; name: string; status: string };
type Resource = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

export function RecordsTable({
    rows,
    resource,
    onPageChange,
    onPerPageChange,
    onEdit,
    onDelete,
}: {
    rows: RecordRow[];
    resource: Resource;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    onEdit: (row: RecordRow) => void;
    onDelete: (row: RecordRow) => void;
}) {
    const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
    const columns: DataTableColumn<RecordRow>[] = [
        { id: 'name', header: 'Nama', cell: (row) => row.name },
        { id: 'status', header: 'Status', cell: (row) => row.status },
    ];

    return (
        <DataTableShell<RecordRow, number>
            data={rows}
            columns={columns}
            getRowKey={(row) => row.id}
            emptyState={<p>Belum ada data.</p>}
            selection={{
                selectedKeys,
                onSelectionChange: setSelectedKeys,
                selectAllLabel: 'Pilih semua baris pada halaman ini',
                getRowLabel: (row) => `Pilih ${row.name}`,
            }}
            rowActions={{
                label: (row) => `Aksi untuk ${row.name}`,
                render: (row) => (
                    <>
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                            Ubah
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(row)}>
                            Hapus
                        </DropdownMenuItem>
                    </>
                ),
            }}
            pagination={{
                resource,
                onPageChange,
                onPerPageChange,
                noun: 'record',
            }}
        />
    );
}
```

Styling: `className` pada container, `tableClassName` pada tabel, serta `headerClassName`/`cellClassName` pada kolom maupun rowActions. `toolbar` menerima ReactNode; `pagination.perPageOptions` dapat mengganti pilihan default 10/20/30/40/50 dan `noun` mengganti label total.

Selection dikontrol caller lewat `selectedKeys`/callback. Select-all bawaan hanya mengganti key dari `data` saat ini (halaman terpasang); implementasikan sendiri aturan lintas halaman di callback `onSelectAll`, pertahankan key lintas halaman dan `selectedCount`/clear sesuai kebutuhan. Pagination menerima shape resource Laravel `current_page`, `last_page`, `per_page`, `total`; callback hanya memberitahu perubahan, bukan fetch. `rowActions` default membungkus render sebagai menu (render isi `DropdownMenuItem`); gunakan `variant: 'custom'` untuk kontrol aksi custom di cell. Legacy `{children}` masih didukung untuk membungkus tabel lama; jangan gabungkan API legacy children dengan props tabel generik. Tidak ada fetch remote, sorting, filter, atau jaminan authorization otomatis.

## Field shells

Publikasi field berada di barrel **named exports** `@/components/form-inputs`; jangan import private `form-input-frame.tsx` atau menyusun frame langsung. Tiap shell mewakili satu field semantik, bukan form builder. Caller memiliki state/form/submit, routes/request, validasi server, error server, dan authorization. `mode` wajib bernilai `'create' | 'edit' | 'view'`; semua juga memerlukan `label: string`. Opsional bersama: `info`, `description`, `warning`, `error` (string), `required`, `disabled` (boolean), `id`, `className` (frame), `controlClassName` (control/root). Props kontrol mengikuti tipe primitive yang dipakai, setelah props frame diambil.

Mode view menonaktifkan kontrol; create/edit aktif kecuali `disabled` eksplisit. View/disabled bukan authorization. Kontrol native disabled tidak masuk browser `FormData`; jangan mengandalkan mode view untuk mengirim data. Description/warning/error tetap inline; `info` tooltip hanya muncul bila string setelah trim tidak kosong, dan terpisah dari kontrol disabled.

### Katalog publik dan nilai

| Shell (named export)      | Nilai/callback/opsi utama                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextInputShell`          | Kontrol input native; `type`: `text` (default), `email`, `password`, `search`, `tel`, `url`, `number`. `onChange` menerima event DOM; nilai number tetap string kecuali caller menormalisasi.                          |
| `DateInputShell`          | Input native `date` (default), `datetime-local`, atau `time` saja; tidak ada month/week. Date-only `YYYY-MM-DD` adalah tanggal kalender, jangan ubah menjadi instant/UTC.                                              |
| `TextareaInputShell`      | Textarea native; `onChange` menerima event DOM.                                                                                                                                                                        |
| `CheckboxInputShell`      | `checked` + `onCheckedChange` boolean atau `'indeterminate'`; untuk data boolean gunakan `next === true`.                                                                                                              |
| `CheckboxGroupInputShell` | `value: string[]`, `onValueChange(string[])`, flat `options`; `required` hanya ARIA/presentasi “minimal satu”, bukan validasi native tiap checkbox.                                                                    |
| `RadioGroupInputShell`    | `value: string`, `onValueChange(string)`, flat `options`.                                                                                                                                                              |
| `SwitchInputShell`        | `checked` + `onCheckedChange(boolean)`.                                                                                                                                                                                |
| `SelectInputShell`        | `value`/`defaultValue` string, `onValueChange(string)`, flat/grouped options, `placeholder`, `triggerRef` (bukan `ref`). Nilai `''` berfungsi sebagai teks placeholder; item kosong tidak pernah menjadi `SelectItem`. |
| `NativeSelectInputShell`  | Native select: event `onChange`; menerima flat/grouped options, termasuk opsi kosong aktual.                                                                                                                           |
| `ComboboxInputShell`      | Pilihan `string \| null`; `undefined` berarti uncontrolled, callback dapat memberi `null`. Props `inputRef`, `placeholder`, `emptyMessage`; input query `onInputValueChange` bukan callback pilihan.                   |
| `MultiComboboxInputShell` | Pilihan `string[]`; `null` normal menjadi array kosong terkontrol, `undefined` uncontrolled. Props query/ref/placeholder serupa single.                                                                                |
| `SliderInputShell`        | `number[]` meskipun satu thumb; `min`/`max` default 0/100, `step`, `onValueChange`, `onValueCommit`; `required` bukan validasi native; `ref` menunjuk root span, bukan thumb.                                          |
| `FileInputShell`          | File native; baca `FileList` dari `event.target.files`. Tidak menerima `value`/`defaultValue`; `accept`, `multiple`, dan atribut native yang diizinkan tipe input dapat dipakai.                                       |
| `ColorInputShell`         | Input warna native, nilai dan `onChange` seperti input (mis. `#rrggbb`); bukan color picker baru.                                                                                                                      |
| `OtpInputShell`           | `value: string`/`onChange(string)`, `maxLength` wajib bilangan safe integer positif; slot dibuat otomatis. Bukan pembuat/pengirim OTP atau fitur keamanan OTP.                                                         |

Tipe `InputSelectOption` diekspor: `{ value: string; label: string; disabled?: boolean }`; `InputSelectOptionGroup` `{ label: string; disabled?: boolean; options: readonly InputSelectOption[] }`. Hanya `SelectInputShell` dan `NativeSelectInputShell` menerima kelompok. CheckboxGroup, RadioGroup, dan kedua Combobox memakai daftar datar. Beri nilai unik stabil dan pastikan opsi terpilih tersedia pada options agar label dapat tampil. Tidak ada pembuatan pilihan free-text. Root primitive meneruskan props hanya sejauh diizinkan tipe komponennya; jangan mengasumsikan props `name`/form tersedia di semua shell. `NativeSelect` meneruskan event DOM, sedangkan `Select` callback berupa string. `type=number`/`required` bukan pengganti aturan server.

Combobox memakai `defaultValue` hanya untuk pemakaian uncontrolled (jangan gabung dengan controlled `value`). Keduanya mendukung `name` dan `form` sesuai tipe API publiknya. Combobox mencari secara lokal dari label opsi; daftar dapat discroll. Remote search/fetch/cache tidak otomatis, dan opsi lengkap termasuk yang sedang terpilih mesti tersedia. `onInputValueChange` hanya notifikasi query. Menghapus chip hanya menghapus pilihan, bukan record master dan bukan aksi yang butuh konfirmasi hapus data. Multi chip remove memiliki accessible name yang diimplementasikan.

Source implementasi: [native/boolean/OTP](resources/js/components/form-inputs/input-shells.tsx), [group/select/slider](resources/js/components/form-inputs/choice-input-shells.tsx), dan [combobox](resources/js/components/form-inputs/combobox-input-shells.tsx). Semua tipe `NamaShellProps` pada katalog diekspor dari barrel, bersama `InputShellProps`/`InputShellMode`. `OtpInputShell` juga menerima `pattern` dan `inputMode` dari primitive input-otp; nilai/pola client bukan pemeriksaan keamanan OTP.

Contoh kecil berikut memakai `mode: InputShellMode` dari caller (`create`, `edit`, atau `view`). Dengan `mode="view"`, hanya kontrol yang terkunci; tombol info tetap dapat dijangkau. Keterangan penting tetap inline melalui `description`, `warning`, dan `error`, bukan hanya tooltip `info`. Nilai, perubahan, dan error tetap milik caller:

```tsx
import { TextInputShell } from '@/components/form-inputs';
import type { InputShellMode } from '@/components/form-inputs';

export function NameField({
    mode,
    value,
    onChange,
    error,
}: {
    mode: InputShellMode;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    return (
        <TextInputShell
            label="Nama"
            mode={mode}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            info="Gunakan nama yang dikenali tim."
            description="Nama ditampilkan pada daftar record."
            warning="Jangan masukkan data rahasia."
            error={error}
            required
            controlClassName="max-w-md"
        />
    );
}
```

Contoh berikut menunjukkan seluruh 15 named shell dalam satu komponen. Controlled state tetap di caller:

```tsx
import { useState } from 'react';
import {
    CheckboxGroupInputShell,
    CheckboxInputShell,
    ColorInputShell,
    ComboboxInputShell,
    DateInputShell,
    FileInputShell,
    MultiComboboxInputShell,
    NativeSelectInputShell,
    OtpInputShell,
    RadioGroupInputShell,
    SelectInputShell,
    SliderInputShell,
    SwitchInputShell,
    TextareaInputShell,
    TextInputShell,
} from '@/components/form-inputs';
import type { InputSelectOption } from '@/components/form-inputs';

const choices: InputSelectOption[] = [
    { value: 'one', label: 'Satu' },
    { value: 'two', label: 'Dua' },
];

export function FieldCatalogExample() {
    const [text, setText] = useState('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const [checked, setChecked] = useState(false);
    const [checks, setChecks] = useState<string[]>([]);
    const [radio, setRadio] = useState('one');
    const [active, setActive] = useState(false);
    const [select, setSelect] = useState('');
    const [native, setNative] = useState('');
    const [combo, setCombo] = useState<string | null>(null);
    const [multi, setMulti] = useState<string[]>([]);
    const [range, setRange] = useState<number[]>([25]);
    const [color, setColor] = useState('#336699');
    const [otp, setOtp] = useState('');

    return (
        <form
            className="space-y-4"
            onSubmit={(event) => event.preventDefault()}
        >
            <TextInputShell
                label="Nama"
                mode="create"
                value={text}
                onChange={(event) => setText(event.target.value)}
            />
            <DateInputShell
                label="Tanggal"
                mode="edit"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
            />
            <TextareaInputShell
                label="Catatan"
                mode="edit"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
            />
            <CheckboxInputShell
                label="Setuju"
                mode="create"
                checked={checked}
                onCheckedChange={(next) => setChecked(next === true)}
            />
            <CheckboxGroupInputShell
                label="Fitur"
                mode="create"
                options={choices}
                value={checks}
                onValueChange={setChecks}
            />
            <RadioGroupInputShell
                label="Pilihan"
                mode="edit"
                options={choices}
                value={radio}
                onValueChange={setRadio}
            />
            <SwitchInputShell
                label="Aktif"
                mode="edit"
                checked={active}
                onCheckedChange={setActive}
            />
            <SelectInputShell
                label="Select"
                mode="create"
                options={choices}
                value={select}
                onValueChange={setSelect}
                placeholder="Pilih"
            />
            <NativeSelectInputShell
                label="Native select"
                mode="create"
                options={[{ value: '', label: 'Pilih' }, ...choices]}
                value={native}
                onChange={(event) => setNative(event.target.value)}
            />
            <ComboboxInputShell
                label="Combo"
                mode="edit"
                options={choices}
                value={combo}
                onValueChange={setCombo}
            />
            <MultiComboboxInputShell
                label="Multi combo"
                mode="create"
                options={choices}
                value={multi}
                onValueChange={setMulti}
            />
            <SliderInputShell
                label="Rentang"
                mode="edit"
                min={0}
                max={100}
                step={5}
                value={range}
                onValueChange={setRange}
            />
            <FileInputShell
                label="Lampiran"
                mode="create"
                accept="image/*"
                multiple
                onChange={(event) => {
                    const files: FileList | null = event.target.files;
                    console.log(files?.length ?? 0);
                }}
            />
            <ColorInputShell
                label="Warna"
                mode="edit"
                value={color}
                onChange={(event) => setColor(event.target.value)}
            />
            <OtpInputShell
                label="Kode"
                mode="create"
                maxLength={6}
                value={otp}
                onChange={setOtp}
            />
        </form>
    );
}
```

Number input tetap string; normalisasi harus disengaja dan validasi authoritative di server. Browser file validation/accept hanyalah UX—server harus memvalidasi isi file juga. Field di dalam `ModalShell` dapat disusun seperti contoh berikut; form state/submit tetap milik komponen induk.

```tsx
import { useState } from 'react';
import { TextInputShell } from '@/components/form-inputs';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import ModalShell from '@/components/ui/modal-shell';

export function FieldModal({ onSave }: { onSave: (name: string) => void }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button type="button" onClick={() => setOpen(true)}>
                Tambah
            </Button>
            <ModalShell>
                <DialogHeader>
                    <DialogTitle>Nama</DialogTitle>
                    <DialogDescription>
                        Contoh field di dalam modal.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSave(name);
                    }}
                >
                    <TextInputShell
                        label="Nama"
                        mode="create"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                    <DialogFooter>
                        <Button type="submit">Simpan</Button>
                    </DialogFooter>
                </form>
            </ModalShell>
        </Dialog>
    );
}
```

`useForm` Inertia dapat menjadi owner state/error/processing; field shell tidak mengirim request sendiri. Contoh memakai `route` string dari aplikasi pemakai (ganti dengan route nyata Anda):

```tsx
import { useForm } from '@inertiajs/react';
import { TextInputShell } from '@/components/form-inputs';
import { Button } from '@/components/ui/button';

export function InertiaFormExample({ endpoint }: { endpoint: string }) {
    const form = useForm({ name: '' });

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.post(endpoint, { onSuccess: () => form.setDefaults() });
    }

    return (
        <form onSubmit={submit}>
            <TextInputShell
                label="Nama"
                mode="create"
                value={form.data.name}
                onChange={(event) => form.setData('name', event.target.value)}
                error={form.errors.name}
            />
            <Button type="submit" disabled={form.processing}>
                Simpan
            </Button>
        </form>
    );
}
```

`Select` dan combobox terkait memakai callback value, bukan `onChange`; checkbox boolean dinormalisasi melalui `next === true`. Checkbox group `required` bersifat group ARIA/presentasi dan wajib divalidasi di caller/server. Slider `required` juga tidak menciptakan constraint native.

## Helper, formatter, dan hooks

Import helper dari alias `@/lib/...`, hook dari `@/hooks/...`. Source kontrak: [utils](resources/js/lib/utils.ts), [formatters](resources/js/lib/formatters.ts), [date-time](resources/js/lib/date-time.ts), [table-query](resources/js/lib/table-query.ts), [upload](resources/js/lib/upload.ts), [debounce](resources/js/hooks/use-debounced-value.ts), [unsaved guard](resources/js/hooks/use-unsaved-changes-guard.ts), [confirmation provider](resources/js/components/ui/confirmation-provider.tsx), dan [confirmation modal](resources/js/components/ui/confirmation-modal.tsx).

### Utility dan angka

`@/lib/utils`: `cn(...inputs: ClassValue[])` gabungkan class dan tailwind-merge; `toUrl(href)` menerima bentuk `InertiaLinkProps['href']` non-null; `getInitials(string)` menghasilkan inisial atau `?`.

```ts
import { cn, getInitials, toUrl } from '@/lib/utils';
const active = true;
const classes = cn('px-2', active && 'px-4');
const initials = getInitials('Ayu Putri');
const url = toUrl('/records');
```

Utilitas Rupiah: `canonicalizeRupiahInput(string): string | null` mengembalikan bentuk kanonik desimal atau null; `formatCurrencyInput(value, previousValue?)` untuk input terkendali dengan format sebelumnya; `formatRupiah(number|string)` menampilkan `Rp` dan desimal lokal. `formatCurrency(amount, opts?)` default **USD/en-US**, bukan IDR:

```ts
import {
    canonicalizeRupiahInput,
    formatCurrency,
    formatCurrencyInput,
    formatRupiah,
} from '@/lib/utils';
const canonical = canonicalizeRupiahInput('1.250,5');
const displayInput = formatCurrencyInput('1.250,50', '1250,5');
const rupiah = formatRupiah(canonical ?? '0');
const idr = formatCurrency(12500, { currency: 'IDR', locale: 'id-ID' });
```

Formatter `@/lib/formatters` memakai config `{ locale?, options? }`: `formatNumber(value, config?)`, `formatPercent(value, config?)`, `formatCompactNumber(value, config?)`, `formatFileSize(value, config?)`. `0.125` berarti `12.5%`; ukuran file memakai unit biner (KiB = 1024 B); nilai numerik invalid/nullish (dan ukuran negatif) menjadi `'-'`.

```ts
import {
    formatCompactNumber,
    formatFileSize,
    formatNumber,
    formatPercent,
} from '@/lib/formatters';
const count = formatNumber(1234, { locale: 'id-ID' });
const ratio = formatPercent(0.125, { locale: 'id-ID' });
const compact = formatCompactNumber(12500, { locale: 'id-ID' });
const bytes = formatFileSize(2048, { locale: 'id-ID' });
```

Config number/percent/compact menerima `options: Intl.NumberFormatOptions`. FileSize hanya menerima `minimumFractionDigits`, `maximumFractionDigits`, `useGrouping` dalam `options` (presisi dibatasi 0–6). `formatCurrency` mendukung `currency`, `locale`, `minimumFractionDigits`, `maximumFractionDigits`, `noDecimals`; default `formatCurrencyInput` untuk previousValue adalah `''`. Format uang/angka tidak melakukan aritmetika uang, rounding domain khusus, atau validasi server.

### Tanggal/waktu lokal

`@/lib/date-time`: `getLocalTimeZone(): string`, `localDateKey(date: Date): string`, `formatLocalDate(value: string|Date)`, `formatLocalDateTime(value: string|Date)`. String date-only harus kalender valid `YYYY-MM-DD` dan diformat sebagai tanggal kalender, tanpa pergeseran zona. Timestamp harus ISO instant dengan `Z` atau offset (contoh `2026-01-02T03:04:05Z`); timestamp tanpa zona tidak dianggap instant valid. Instant diformat di timezone browser. SSR fallback helper adalah `Asia/Makassar`; tidak ada prop timezone override.

```ts
import {
    formatLocalDate,
    formatLocalDateTime,
    getLocalTimeZone,
    localDateKey,
} from '@/lib/date-time';
const calendarDate = formatLocalDate('2026-01-02');
const localInstant = formatLocalDateTime('2026-01-02T03:04:05Z');
const zone = getLocalTimeZone();
const todayKey = localDateKey(new Date());
```

Komponen [`LocalDateTime`](resources/js/components/local-date-time.tsx) memberi placeholder saat server render/awal hydration lalu format lokal setelah browser tersedia:

```tsx
import { LocalDateTime } from '@/components/local-date-time';
<LocalDateTime value="2026-01-02T03:04:05Z" mode="date-time" />;
```

Batas ini menghindari mismatch akibat timezone server/browser; UI dapat berubah setelah hydration. Format browser nyata belum menjadi browser acceptance test di sini.

### Table query

`parseTableQuery(input: URLSearchParams|string, config?)` dan `buildTableQuery(state, config?)` dari `@/lib/table-query`. Config whitelist: `sortFields`, `filterKeys`, `perPageOptions`, `defaultPerPage`. State memakai `perPage`, wire query memakai `per_page`; builder mengembalikan `URLSearchParams`, bukan object atau string.

```ts
import { buildTableQuery, parseTableQuery } from '@/lib/table-query';
const config = {
    sortFields: ['name', 'created_at'],
    filterKeys: ['status', 'team'],
    perPageOptions: [10, 25, 50],
    defaultPerPage: 25,
} as const;
const state = parseTableQuery(
    '?search=ana&page=2&per_page=25&status=active',
    config,
);
const params: URLSearchParams = buildTableQuery({ ...state, page: 1 }, config);
```

Filter memakai key datar (misalnya `status=active`), bukan sintaks array bracket. Reset page ke 1 ketika search/filter berubah; cegah race request di pemilik fetch. Whitelist client bukan pengganti validasi allowlist sort/filter di server.

### Hooks state

`useDebouncedValue<T>(value, delayMs = 300): T` dari `@/hooks/use-debounced-value` hanya menunda perubahan nilai; ia tidak membatalkan request/race. Cancellation, abort, dan stale-response handling tetap di pemilik request.

`useUnsavedChangesGuard(isDirty, { enabled = true, message? }?)` dari `@/hooks/use-unsaved-changes-guard` adalah opt-in untuk satu halaman/workspace, memakai status dirty milik caller (misalnya `useForm`). Setelah save berhasil, update defaults/form dirty state. Guard memakai native synchronous `window.confirm` untuk navigasi Inertia yang didukung; prompt unload dikendalikan browser dan teksnya dapat diubah browser. Back/Forward tidak dapat diblokir lewat event `before` Inertia. Ini peringatan, bukan jaminan bebas kehilangan data. Jangan menggantinya dengan konfirmasi async.

```tsx
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';

export function WorkspaceStatus({
    isDirty,
    search,
}: {
    isDirty: boolean;
    search: string;
}) {
    useUnsavedChangesGuard(isDirty, {
        message: 'Tinggalkan perubahan yang belum disimpan?',
    });
    const debouncedSearch = useDebouncedValue(search, 300);
    return <output>{debouncedSearch}</output>;
}
```

### Upload, download, konfirmasi

`validateUploadFile(file, { maxSizeBytes, allowedMimeTypes?, allowedExtensions? })` dari `@/lib/upload` mengembalikan `{ valid: true }` atau `{ valid: false, error }`; kode gagal: `file-too-large`, `file-type-not-allowed`, `invalid-options`. Bila kedua allowlist tidak diberikan, pemeriksaan hanya mencakup ukuran/metadata file serta validitas opsi. Bila pembatasan tipe diberikan, setidaknya satu MIME **atau** ekstensi final nama file harus benar-benar cocok. Daftar kosong tidak dapat cocok, tetapi tidak membatalkan kecocokan dari daftar lainnya. Kedua daftar kosong (atau satu-satunya daftar yang diberikan kosong) menolak semua tipe. Tidak ada dukungan wildcard MIME otomatis. Ini hanya UX: server tetap memeriksa upload beserta isinya.

```ts
import { validateUploadFile } from '@/lib/upload';
export function checkImage(file: File) {
    const result = validateUploadFile(file, {
        maxSizeBytes: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/png'],
        allowedExtensions: ['.jpg', '.png'],
    });
    return result.valid ? 'Valid' : result.error;
}
```

`downloadBlob(blob, filename)` hanya memicu unduhan Blob pada browser; ia tidak melakukan HTTP request atau membuat export server.

```tsx
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/lib/upload';
export function DownloadExample({ blob }: { blob: Blob }) {
    return (
        <Button type="button" onClick={() => downloadBlob(blob, 'laporan.txt')}>
            Unduh
        </Button>
    );
}
```

`useConfirmation()` dari `@/components/ui/confirmation-provider` menghasilkan `confirm({ title, description }): Promise<boolean>`; provider sudah dipasang oleh [`app.tsx`](resources/js/app.tsx), jangan pasang provider kedua. Caller menjalankan operasi async sesudah hasil positif:

```tsx
import { Button } from '@/components/ui/button';
import { useConfirmation } from '@/components/ui/confirmation-provider';
export function DeleteAction({ onDelete }: { onDelete: () => Promise<void> }) {
    const confirm = useConfirmation();
    async function removeRecord() {
        if (
            await confirm({
                title: 'Hapus?',
                description: 'Aksi ini perlu diotorisasi server.',
            })
        ) {
            await onDelete();
        }
    }
    return (
        <Button type="button" onClick={removeRecord}>
            Hapus
        </Button>
    );
}
```

Hook tidak memiliki opsi label tombol atau processing. Untuk label/processing kustom, gunakan default export `ConfirmationModal` dari `@/components/ui/confirmation-modal` secara eksplisit; props aktualnya `open`, `title`, `description`, opsional `confirmLabel`, `cancelLabel`, `processing`, `onCloseAutoFocus`, serta `onConfirm`/`onCancel`. Callback keduanya `() => void`; caller memiliki operasi dan error async. Konfirmasi UI bukan kontrol authorization.

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ConfirmationModal from '@/components/ui/confirmation-modal';

export function CustomDelete({ onDelete }: { onDelete: () => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    async function submit() {
        setProcessing(true);
        setError('');
        try {
            await onDelete();
            setOpen(false);
        } catch {
            setError('Gagal menghapus. Coba lagi.');
        } finally {
            setProcessing(false);
        }
    }
    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                Hapus
            </Button>
            <p role="status">{error}</p>
            <ConfirmationModal
                open={open}
                title="Hapus record?"
                description="Periksa kembali pilihan Anda."
                confirmLabel="Ya, hapus"
                cancelLabel="Kembali"
                processing={processing}
                onConfirm={() => {
                    void submit();
                }}
                onCancel={() => setOpen(false)}
            />
        </>
    );
}
```

## Docker (konfigurasi tersedia)

Repository menyediakan [`Dockerfile`](Dockerfile), [`compose.yaml`](compose.yaml), dan [`docker/entrypoint.sh`](docker/entrypoint.sh). Image memakai nginx + PHP 8.5 FPM dan SQLite; konfigurasi membangun image, memetakan port `8000:80`, serta menggunakan volume bernama untuk database, storage aplikasi, dan log. Entry point membuat ulang `.env` dari environment container dan menjalankan `php artisan migrate --force` saat container start. Jangan jalankan konfigurasi ini pada data/lingkungan produksi tanpa memahami implikasi dan mengatur key/environment/backup dengan benar. Berkas ini didokumentasikan dari source, **belum diuji ulang untuk tugas dokumentasi ini**, dan bukan klaim deployment production-ready.

Contoh perintah yang ada di README lama:

```bash
export APP_KEY="$(php artisan key:generate --show)"
docker compose up -d --build
```

Perintah ini membangun/memulai container dan entry point menjalankan migrasi; gunakan hanya pada lingkungan lokal disposable yang Anda pahami. Container mengiklankan port 8000.

## Checklist adopsi dan batasan

- Tentukan domain nyata: routes, data, model, policy/authorization, validasi server, error handling, persistence dan workflow.
- Ganti data/statistik/menu demo dengan data dan aksi milik aplikasi; jangan menganggap halaman demo sebagai modul produksi.
- Tinjau konfigurasi produksi, autentikasi, session, key, logging, queue, database, upload inspection/limits dan backup secara terpisah.
- Uji browser sasaran untuk keyboard, fokus, touch, portal, responsive layout, hydration dan validasi alur nyata. Unit/source tests tidak membuktikan penerimaan browser tersebut.
- Beberapa batas aksesibilitas yang diketahui dan ditunda: trigger/clear pada single Combobox serta accessible name/description per thumb pada Slider. Tidak diperbaiki dalam panduan ini; jangan mengklaim aksesibilitas tuntas.

Periksa metadata lisensi di [`composer.json`](composer.json); repository ini tidak menyertakan berkas LICENSE terpisah.

## Lisensi

MIT (metadata di `composer.json`; tidak ada file `LICENSE` terpisah di checkout ini).
