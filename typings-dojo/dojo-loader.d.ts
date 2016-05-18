declare namespace DojoLoader {
    export interface Config {
        baseUrl?: string;
        map?: ModuleMap;
        packages?: Package[];
        paths?: { [ path: string ]: string; };
        pkgs?: { [ path: string ]: Package; };
    }

    interface ModuleMap extends ModuleMapItem {
        [ sourceMid: string ]: ModuleMapReplacement;
    }

    interface ModuleMapItem {
        [ mid: string ]: /* ModuleMapReplacement | ModuleMap */ any;
    }

    interface ModuleMapReplacement extends ModuleMapItem {
        [ findMid: string ]: /* replaceMid */ string;
    }

    interface Package {
        location?: string;
        main?: string;
        name?: string;
    }

    interface Require {
        (dependencies: string[], callback: RequireCallback): void;
        <ModuleType>(moduleId: string): ModuleType;

        toAbsMid(moduleId: string): string;
        toUrl(path: string): string;
    }

    interface RequireCallback {
        (...modules: any[]): void;
    }
}