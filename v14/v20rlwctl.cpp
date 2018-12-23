
#include <iostream>
#include "viinex\viinex.h"
#include <thread>
#include <chrono>
#include <vector>
#include <string>
#include <fstream>

#include "json.hpp"
#include "jget.h"

#include "windows.h"

using json = nlohmann::json;

#pragma comment(lib,"ViinexClient.lib")

inline std::string ErrorToString(int code)
{
    char buffer[1024];
    vnx_format_error_message(code, buffer, sizeof(buffer));
    return buffer;
}

#define proc_error(res, msg) do {\
    if (vnx_err_ok != res) \
    { \
        std::cerr << msg << ": " << ErrorToString(res).c_str(); \
        goto bailout; \
    } \
} while(false)

bool read_json_line(json &j) {
    std::string ln;
    std::getline(std::cin, ln);
    if (ln.empty())
        return false;
    std::stringstream ss(ln);
    try {
        ss >> j;
    }
    catch (const std::exception&) {
        return false;
    }
    return true;
}

int main()
{
    int res;
    vnx_ctx_t ctx = 0;

    json config;
    read_json_line(config); // {"rlwctl":"1"}

    std::string rlwctl_id;
    if(!mjget(config, "rlwctl", rlwctl_id)) {
        std::cerr << "rlwctl not specified in config.";
        return -1;
    }
    std::string host = jget(config, "host", std::string("127.0.0.1"));

    json filter = jget(config, "filter", json());
    std::string ftopic = jget(filter, "topic", std::string("DigitalInput"));
    json forigin = jget(filter, "origin", json());

    res = vnx_initialize(host.c_str(), 17900, ("v2rlwctl."+rlwctl_id+".log").c_str(), 100, &ctx);
    proc_error(res, "vnx_initialize");

    vnx_rlwctl_ctx_t rlwctl = 0;
    res=vnx_rlwctl_open(ctx, rlwctl_id.c_str(), &rlwctl);
    proc_error(res, "vnx_rlwctl_open");

    while (std::cin) {
        json j;
        if (!read_json_line(j))
            break;
        json origin;
        std::string topic;
        json data;
        if (!mjget(j, "topic", topic) || topic != ftopic) {
            std::cerr << "topic not present or irrelevant";
            continue;
        }
        if (!mjget(j, "origin", origin) || origin != forigin) {
            std::cerr << origin;
            std::cerr << forigin;
            std::cerr << "origin not present or irrelevant";
            continue;
        }
        if (!mjget(j, "data", data)) {
            std::cerr << "data not present";
            continue;
        }
        bool state;
        if (!mjget(data, "state", state)) {
            std::cerr << "state not present";
            continue;
        }
        /*
        if (!mjget(j, "timestamp", ts)) {
            std::cerr << "state not present" << std::endl;
            continue;
        }
        */
        SYSTEMTIME st;
        GetSystemTime(&st);
        uint64_t ts;
        vnx_timestamp_make(st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond, st.wMilliseconds, &ts);

        res = vnx_rlwctl_signal(rlwctl, ts, state);
        proc_error(res, "vnx_rlwctl_signal");
    }

    res = vnx_rlwctl_close(rlwctl);
    bailout:
    res = vnx_shutdown(ctx);

    return 0;
}
